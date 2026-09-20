import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { ParkingAlert } from "@/types";
import { dispatchAlertNotifications } from "@/lib/notifications/alert-dispatch";
import { escalateStaleAlerts } from "@/lib/notifications/escalate-stale";
import { parsePagination, computeHasMore } from "@/lib/api/query";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const supabase = await createClient();

    // Timed escalation: alerts pending past the threshold are pushed to the
    // security team once. Runs lazily on read, so no scheduler is required.
    try {
      await escalateStaleAlerts(supabase, { organizationId: session.organizationId });
    } catch {
      // Never block the inbox on escalation problems.
    }

    // Server-side pagination (opt-in). Without a limit, all rows are returned
    // for backwards compatibility (reports, dashboard aggregates).
    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePagination(searchParams);

    let query = supabase
      .from("parking_alerts")
      .select(`
        *,
        vehicle:vehicles(plate_number, make, model, color),
        owner:profiles!parking_alerts_owner_id_fkey(name_ar, name_en, mobile, employee_id),
        reporter:profiles!parking_alerts_reporter_id_fkey(name_ar, name_en, mobile, employee_id),
        alert_type:parking_alert_types(code, name_ar, name_en)
      `)
      .eq("organization_id", session.organizationId)
      .order("created_at", { ascending: false });

    if (limit !== null) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alerts: data || [],
      hasMore: computeHasMore(data, limit),
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const body = await request.json();
    const { vehicleId, ownerId, alertTypeCode, message } = body;

    if (!vehicleId || !ownerId) {
      return NextResponse.json(
        { success: false, error: "vehicleId and ownerId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Resolve alert_type_id by code
    const codeToFind = alertTypeCode || "BLOCKING";
    const { data: typeRow } = await supabase
      .from("parking_alert_types")
      .select("id")
      .eq("organization_id", session.organizationId)
      .eq("code", codeToFind)
      .single();

    const alertTypeId = typeRow?.id || "20000000-0000-0000-0000-000000000001";

    // Strictly enforce session identity: reporter_id and organization_id MUST be from session
    const insertPayload = {
      organization_id: session.organizationId,
      vehicle_id: vehicleId,
      owner_id: ownerId,
      reporter_id: session.profile.id, // Strictly derived from session!
      alert_type_id: alertTypeId,
      status: "pending",
      message: message || "سيارتك حاجزة سيارتي",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("parking_alerts")
      .insert(insertPayload)
      .select(`
        *,
        vehicle:vehicles(plate_number, make, model, color),
        owner:profiles!parking_alerts_owner_id_fkey(name_ar, name_en, mobile, employee_id),
        reporter:profiles!parking_alerts_reporter_id_fkey(name_ar, name_en, mobile, employee_id),
        alert_type:parking_alert_types(code, name_ar, name_en)
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Dispatch Web Push to the car owner, escalating to security when unreachable
    try {
      const reporterName = session.profile.name_ar || session.profile.name_en || "أحد الزملاء";
      await dispatchAlertNotifications(supabase, {
        organizationId: session.organizationId,
        ownerId,
        alertId: inserted?.id || null,
        plateDisplay: inserted?.vehicle?.plate_number || "",
        reporterName,
        url: "/inbox",
      });
    } catch (pushErr) {
      console.warn("Alert notification dispatch error:", pushErr);
    }

    return NextResponse.json({
      success: true,
      alert: inserted,
      message: "Alert created successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const body = await request.json();
    const { alertId, status } = body;

    if (!alertId || !status) {
      return NextResponse.json(
        { success: false, error: "alertId and status are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify alert exists and belongs to user's org
    const { data: currentAlert, error: fetchError } = await supabase
      .from("parking_alerts")
      .select("*")
      .eq("id", alertId)
      .eq("organization_id", session.organizationId)
      .single();

    if (fetchError || !currentAlert) {
      return NextResponse.json({ success: false, error: "Alert not found" }, { status: 404 });
    }

    // Role check: Only owner, reporter, admin or security can change alert status
    const isOwner = currentAlert.owner_id === session.profile.id;
    const isReporter = currentAlert.reporter_id === session.profile.id;
    const isStaffAuthorized = session.role === "admin" || session.role === "super_admin" || session.role === "security";

    if (!isOwner && !isReporter && !isStaffAuthorized) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Not authorized to update this alert" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = { status };

    if (status === "acknowledged") {
      updatePayload.acknowledged_at = now;
    } else if (status === "resolved") {
      updatePayload.resolved_at = now;
      if (!currentAlert.acknowledged_at) {
        updatePayload.acknowledged_at = now;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("parking_alerts")
      .update(updatePayload)
      .eq("id", alertId)
      .select(`
        *,
        vehicle:vehicles(plate_number, make, model, color),
        owner:profiles!parking_alerts_owner_id_fkey(name_ar, name_en, mobile, employee_id),
        reporter:profiles!parking_alerts_reporter_id_fkey(name_ar, name_en, mobile, employee_id),
        alert_type:parking_alert_types(code, name_ar, name_en)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alert: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

