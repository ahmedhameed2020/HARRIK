import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { applyPrivacyMask, getOrgSettings } from "@/lib/org-settings";
import type { DepartmentKind } from "@/types";

const ROW_CAP = 5_000;

function normalizeKind(value: unknown): DepartmentKind {
  return value === "administrative" || value === "support" ? value : "academic";
}

/**
 * GET /api/departments/[id]
 *
 * Members of one unit together with the vehicles registered to them, for the
 * quick-access browse ("who is in the science department and what do they
 * drive?"). Member-readable, tenant-scoped, and **privacy-aware**: the tenant's
 * privacy mode decides whether names, employee ids and phone numbers are
 * returned at all, so a browsable directory can never leak more than the
 * plate-search flow already does.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error, status } = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    const orgId = session.organizationId;
    const supabase = await createClient();

    const { data: department, error: deptError } = await supabase
      .from("departments")
      .select("id, organization_id, name_ar, name_en, code, kind, is_active, created_at")
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (deptError) {
      return NextResponse.json({ success: false, error: deptError.message }, { status: 400 });
    }
    if (!department) {
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 }
      );
    }

    const [profilesResult, settings] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name_ar, name_en, employee_id, mobile, role, preferred_language")
        .eq("organization_id", orgId)
        .eq("department_id", id)
        .eq("is_active", true)
        .order("name_ar")
        .limit(ROW_CAP),
      getOrgSettings(supabase, orgId),
    ]);

    if (profilesResult.error) {
      return NextResponse.json(
        { success: false, error: profilesResult.error.message },
        { status: 400 }
      );
    }

    const profiles = (profilesResult.data ?? []) as {
      id: string;
      name_ar: string | null;
      name_en: string | null;
      employee_id: string | null;
      mobile: string | null;
      role: string;
      preferred_language: string | null;
    }[];

    const ids = profiles.map((p) => p.id);

    // Ownership is stored in `staff_vehicles` (vehicles has no owner column).
    const linksResult = ids.length
      ? await supabase
          .from("staff_vehicles")
          .select("staff_id, vehicle_id, is_primary")
          .eq("organization_id", orgId)
          .in("staff_id", ids)
          .limit(ROW_CAP)
      : { data: [], error: null as null };

    if (linksResult.error) {
      return NextResponse.json(
        { success: false, error: linksResult.error.message },
        { status: 400 }
      );
    }

    const links = (linksResult.data ?? []) as {
      staff_id: string;
      vehicle_id: string;
      is_primary: boolean;
    }[];
    const vehicleIds = [...new Set(links.map((l) => l.vehicle_id))];

    const vehiclesResult = vehicleIds.length
      ? await supabase
          .from("vehicles")
          .select("id, plate_number, make, model, color, is_active")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .in("id", vehicleIds)
          .limit(ROW_CAP)
      : { data: [], error: null as null };

    if (vehiclesResult.error) {
      return NextResponse.json(
        { success: false, error: vehiclesResult.error.message },
        { status: 400 }
      );
    }

    const vehicleById = new Map<string, ReturnType<typeof toVehicle>>();
    for (const row of (vehiclesResult.data ?? []) as Record<string, unknown>[]) {
      const vehicle = toVehicle(row);
      vehicleById.set(vehicle.id, vehicle);
    }

    const vehiclesByOwner = new Map<string, ReturnType<typeof toVehicle>[]>();
    for (const link of links) {
      const vehicle = vehicleById.get(link.vehicle_id);
      if (!vehicle) continue; // inactive or missing
      const list = vehiclesByOwner.get(link.staff_id) ?? [];
      list.push({ ...vehicle, isPrimary: link.is_primary });
      vehiclesByOwner.set(link.staff_id, list);
    }

    const members = profiles.map((profile) => {
      // Reuse the exact masking rules the plate-search results use.
      const masked = applyPrivacyMask(
        {
          owner_name_ar: profile.name_ar,
          owner_name_en: profile.name_en,
          owner_employee_id: profile.employee_id,
          owner_mobile: profile.mobile,
          department_name_ar: department.name_ar as string,
          department_name_en: department.name_en as string,
        },
        settings.privacy_mode
      );

      return {
        id: profile.id,
        nameAr: masked.owner_name_ar,
        nameEn: masked.owner_name_en,
        employeeId: masked.owner_employee_id,
        mobile: masked.owner_mobile,
        role: profile.role,
        preferredLanguage: profile.preferred_language,
        vehicles: vehiclesByOwner.get(profile.id) ?? [],
      };
    });

    const departmentSummary = {
      id: department.id as string,
      organization_id: department.organization_id as string,
      name_ar: department.name_ar as string,
      name_en: department.name_en as string,
      code: department.code as string,
      kind: normalizeKind(department.kind),
      is_active: Boolean(department.is_active),
      created_at: department.created_at as string,
      staffCount: members.length,
      vehicleCount: members.reduce((sum, m) => sum + m.vehicles.length, 0),
    };

    return NextResponse.json({
      success: true,
      department: departmentSummary,
      members,
      privacyMode: settings.privacy_mode,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function toVehicle(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    plateNumber: (row.plate_number as string) ?? "",
    make: (row.make as string) ?? null,
    model: (row.model as string) ?? null,
    color: (row.color as string) ?? null,
    isPrimary: false,
  };
}
