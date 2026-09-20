import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { normalizePlateNumber } from "@/lib/plate-normalizer";

/**
 * POST /api/unknown/promote
 *
 * Resolves an unknown-vehicle report by registering the vehicle in the
 * organization directory and optionally linking it to a staff owner.
 * The report is then marked `identified`.
 *
 * Body: {
 *   reportId: string,
 *   ownerId?: string | null,       // staff profile to link (optional)
 *   make?, model?, color?, year?   // override the reported vehicle details
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    if (!["admin", "super_admin", "security"].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: "غير مصرح: يتطلب صلاحيات إدارة أو أمن" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reportId, ownerId, make, model, color, year } = body || {};

    if (!reportId) {
      return NextResponse.json({ success: false, error: "reportId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Load the report (org-scoped).
    const { data: report, error: reportError } = await supabase
      .from("unknown_vehicle_reports")
      .select("*")
      .eq("id", reportId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (reportError || !report) {
      return NextResponse.json({ success: false, error: "البلاغ غير موجود" }, { status: 404 });
    }

    if (report.status !== "open") {
      return NextResponse.json(
        { success: false, error: "تمت معالجة هذا البلاغ مسبقاً" },
        { status: 409 }
      );
    }

    // 2. Validate the optional owner belongs to this organization.
    if (ownerId) {
      const { data: owner } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", ownerId)
        .eq("organization_id", session.organizationId)
        .maybeSingle();

      if (!owner) {
        return NextResponse.json({ success: false, error: "المالك المحدد غير موجود" }, { status: 400 });
      }
    }

    // 3. Guard against duplicate plates in the directory.
    const normalized = report.normalized_plate || normalizePlateNumber(report.plate_number);

    const { data: existingVehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("organization_id", session.organizationId)
      .eq("normalized_plate", normalized)
      .maybeSingle();

    if (existingVehicle) {
      return NextResponse.json(
        {
          success: false,
          error: "هذه اللوحة مسجّلة مسبقاً في الدليل. يرجى ربط البلاغ بالمركبة القائمة بدلاً من إنشاء سجل جديد.",
          vehicleId: existingVehicle.id,
        },
        { status: 409 }
      );
    }

    // 4. Create the vehicle.
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .insert({
        organization_id: session.organizationId,
        plate_number: report.plate_number,
        normalized_plate: normalized,
        make: (make && String(make).trim()) || report.vehicle_make || "غير محدد",
        model: (model && String(model).trim()) || report.vehicle_model || "غير محدد",
        color: (color && String(color).trim()) || report.vehicle_color || "غير محدد",
        year: year ? Number(year) : null,
        is_active: true,
      })
      .select("*")
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { success: false, error: vehicleError?.message || "تعذّر تسجيل المركبة" },
        { status: 500 }
      );
    }

    // 5. Link the owner (first vehicle becomes primary).
    if (ownerId) {
      const { count } = await supabase
        .from("staff_vehicles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", session.organizationId)
        .eq("staff_id", ownerId);

      const { error: linkError } = await supabase.from("staff_vehicles").insert({
        organization_id: session.organizationId,
        staff_id: ownerId,
        vehicle_id: vehicle.id,
        is_primary: (count ?? 0) === 0,
      });

      if (linkError) {
        // Roll back the orphan vehicle so the directory stays consistent.
        await supabase.from("vehicles").delete().eq("id", vehicle.id);
        return NextResponse.json({ success: false, error: linkError.message }, { status: 500 });
      }
    }

    // 6. Close the report.
    const reportUpdate: Record<string, any> = {
      status: "identified",
      resolved_at: new Date().toISOString(),
    };
    // matched_vehicle_id exists once migration 08 is applied; ignore if not.
    const { error: closeError } = await supabase
      .from("unknown_vehicle_reports")
      .update({ ...reportUpdate, matched_vehicle_id: vehicle.id })
      .eq("id", reportId)
      .eq("organization_id", session.organizationId);

    if (closeError) {
      await supabase
        .from("unknown_vehicle_reports")
        .update(reportUpdate)
        .eq("id", reportId)
        .eq("organization_id", session.organizationId);
    }

    // 7. Audit.
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "promote_unknown_vehicle",
      entity_type: "vehicle",
      entity_id: vehicle.id,
      change_summary: {
        report_id: reportId,
        plate_number: vehicle.plate_number,
        owner_id: ownerId || null,
      },
    });

    return NextResponse.json({
      success: true,
      vehicle,
      message: "تم تسجيل المركبة وربطها بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
