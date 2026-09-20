import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { normalizePlateNumber } from "@/lib/plate-normalizer";
import { parsePagination, computeHasMore } from "@/lib/api/query";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const supabase = await createClient();

    // Server-side filtering and pagination.
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "ALL";
    const { limit, offset } = parsePagination(searchParams);

    let query = supabase
      .from("unknown_vehicle_reports")
      .select(`
        *,
        reporter:profiles!unknown_vehicle_reports_reported_by_fkey(name_ar, name_en, mobile, employee_id)
      `)
      .eq("organization_id", session.organizationId);

    if (statusFilter === "open" || statusFilter === "identified" || statusFilter === "dismissed") {
      query = query.eq("status", statusFilter);
    }

    query = query.order("created_at", { ascending: false });
    if (limit !== null) query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reports: data || [],
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
    const { plateNumber, make, model, color, note } = body;

    if (!plateNumber) {
      return NextResponse.json({ success: false, error: "plateNumber is required" }, { status: 400 });
    }

    const normalized = normalizePlateNumber(plateNumber);
    const supabase = await createClient();

    const insertPayload = {
      organization_id: session.organizationId,
      reported_by: session.profile.id, // Strictly derived from session!
      plate_number: plateNumber,
      normalized_plate: normalized,
      vehicle_make: make || null,
      vehicle_model: model || null,
      vehicle_color: color || null,
      note: note || null,
      status: "open",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("unknown_vehicle_reports")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report: inserted,
      message: "Unknown vehicle report created successfully",
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

    if (session.role !== "admin" && session.role !== "super_admin" && session.role !== "security") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "id and status are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: updated, error: updateError } = await supabase
      .from("unknown_vehicle_reports")
      .update({
        status,
        resolved_at: status !== "open" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("organization_id", session.organizationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, report: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
