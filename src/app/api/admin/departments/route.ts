import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import type { DepartmentKind } from "@/types";

const KINDS: DepartmentKind[] = ["academic", "administrative", "support"];

function normalizeKind(value: unknown, fallback: DepartmentKind = "academic"): DepartmentKind {
  return KINDS.includes(value as DepartmentKind) ? (value as DepartmentKind) : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const supabase = await createClient();
    const { data: departments, error } = await supabase
      .from("departments")
      .select("*, profiles:profiles(id)")
      .eq("organization_id", session.organizationId)
      .order("name_ar", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const formatted = (departments || []).map((d: any) => ({
      ...d,
      staffCount: d.profiles?.length || 0,
    }));

    return NextResponse.json({ success: true, departments: formatted });
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

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { code, nameAr, nameEn, kind } = body;

    if (!code || !nameAr) {
      return NextResponse.json({ success: false, error: "code and nameAr are required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: created, error } = await supabase
      .from("departments")
      .insert({
        organization_id: session.organizationId,
        code: code.trim().toUpperCase(),
        name_ar: nameAr.trim(),
        name_en: (nameEn || nameAr).trim(),
        kind: normalizeKind(kind),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "create_department",
      entity_type: "department",
      entity_id: created.id,
      change_summary: created,
    });

    return NextResponse.json({ success: true, department: created });
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

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { id, nameAr, nameEn, code, isActive, kind } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // If trying to deactivate, ensure no active staff belong to it
    if (isActive === false) {
      const { data: activeStaff } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", session.organizationId)
        .eq("department_id", id)
        .eq("is_active", true);

      if (activeStaff && activeStaff.length > 0) {
        return NextResponse.json(
          { success: false, error: `Cannot deactivate department with ${activeStaff.length} active staff members. Reassign staff first.` },
          { status: 409 }
        );
      }
    }

    const updatePayload: Record<string, any> = {};
    if (nameAr !== undefined) updatePayload.name_ar = nameAr.trim();
    if (nameEn !== undefined) updatePayload.name_en = nameEn.trim();
    if (code !== undefined) updatePayload.code = code.trim().toUpperCase();
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);
    if (kind !== undefined) updatePayload.kind = normalizeKind(kind);

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("departments")
      .update(updatePayload)
      .eq("id", id)
      .eq("organization_id", session.organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "update_department",
      entity_type: "department",
      entity_id: id,
      change_summary: updated,
    });

    return NextResponse.json({ success: true, department: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
