import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import type { DepartmentKind, DepartmentSummary } from "@/types";

/** Row caps — a tenant's directory is small, but keep the payload bounded. */
const ROW_CAP = 10_000;

const KINDS: DepartmentKind[] = ["academic", "administrative", "support"];

function normalizeKind(value: unknown): DepartmentKind {
  return KINDS.includes(value as DepartmentKind) ? (value as DepartmentKind) : "academic";
}

/**
 * GET /api/departments
 *
 * Member-readable list of the tenant's active units with how many people and
 * vehicles belong to each — the data behind the quick-access strip and the
 * "no results, try a department" suggestion. Any authenticated member can call
 * it; it exposes counts only, never personal data.
 */
export async function GET() {
  try {
    const { session, error, status } = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ success: false, error }, { status });
    }
    const orgId = session.organizationId;
    const supabase = await createClient();

    const [departments, profiles, vehicles, links] = await Promise.all([
      supabase
        .from("departments")
        .select("id, organization_id, name_ar, name_en, code, kind, is_active, created_at")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name_ar")
        .limit(ROW_CAP),
      supabase
        .from("profiles")
        .select("id, department_id")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .limit(ROW_CAP),
      supabase
        .from("vehicles")
        .select("id, is_active")
        .eq("organization_id", orgId)
        .limit(ROW_CAP),
      // Ownership lives in the join table — `vehicles` has no owner column.
      supabase
        .from("staff_vehicles")
        .select("staff_id, vehicle_id")
        .eq("organization_id", orgId)
        .limit(ROW_CAP),
    ]);

    if (departments.error) {
      return NextResponse.json(
        { success: false, error: departments.error.message },
        { status: 400 }
      );
    }

    const staffRows = (profiles.data ?? []) as { id: string; department_id: string | null }[];
    const vehicleRows = (vehicles.data ?? []) as { id: string; is_active: boolean }[];
    const linkRows = (links.data ?? []) as { staff_id: string; vehicle_id: string }[];

    const activeVehicle = new Set(
      vehicleRows.filter((v) => v.is_active).map((v) => v.id)
    );

    const staffPerDept = new Map<string, number>();
    const departmentOfStaff = new Map<string, string>();
    for (const row of staffRows) {
      if (!row.department_id) continue;
      departmentOfStaff.set(row.id, row.department_id);
      staffPerDept.set(row.department_id, (staffPerDept.get(row.department_id) ?? 0) + 1);
    }

    const countedVehicles = new Set<string>();
    const vehiclesPerDept = new Map<string, number>();
    for (const link of linkRows) {
      if (!activeVehicle.has(link.vehicle_id)) continue;
      const dept = departmentOfStaff.get(link.staff_id);
      if (!dept) continue;
      // A vehicle shared by two people in the same unit counts once.
      const key = `${dept}:${link.vehicle_id}`;
      if (countedVehicles.has(key)) continue;
      countedVehicles.add(key);
      vehiclesPerDept.set(dept, (vehiclesPerDept.get(dept) ?? 0) + 1);
    }

    const summaries: DepartmentSummary[] = (
      (departments.data ?? []) as Record<string, unknown>[]
    ).map((row) => ({
      id: row.id as string,
      organization_id: row.organization_id as string,
      name_ar: row.name_ar as string,
      name_en: row.name_en as string,
      code: row.code as string,
      kind: normalizeKind(row.kind),
      is_active: Boolean(row.is_active),
      created_at: row.created_at as string,
      staffCount: staffPerDept.get(row.id as string) ?? 0,
      vehicleCount: vehiclesPerDept.get(row.id as string) ?? 0,
    }));

    return NextResponse.json({ success: true, departments: summaries });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
