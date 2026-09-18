import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    if (session.role !== "admin" && session.role !== "super_admin" && session.role !== "security") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: staff, error } = await supabase
      .from("profiles")
      .select(`
        *,
        department:departments(id, code, name_en, name_ar),
        staff_vehicles:staff_vehicles(
          id,
          is_primary,
          vehicle:vehicles(id, plate_number, make, model, color, is_active)
        )
      `)
      .eq("organization_id", session.organizationId)
      .order("employee_id", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, staff: staff || [] });
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
    const {
      employeeId,
      nameAr,
      nameEn,
      mobile,
      departmentId,
      role = "staff",
      preferredLanguage = "ar",
      isActive = true,
    } = body;

    if (!employeeId || !nameAr || !mobile) {
      return NextResponse.json(
        { success: false, error: "employeeId, nameAr, and mobile are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check duplicate employee_id within organization
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", session.organizationId)
      .eq("employee_id", employeeId.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Employee ID already exists in this organization" },
        { status: 409 }
      );
    }

    const adminClient = createAdminClient();
    const sanitizedEmp = employeeId.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const staffEmail = body.email || `staff_${sanitizedEmp}@school.edu.qa`;

    let authUserId: string;
    const { data: authData, error: authCreateError } = await adminClient.auth.admin.createUser({
      email: staffEmail,
      password: body.password || "Password123!",
      email_confirm: true,
      user_metadata: {
        name_ar: nameAr.trim(),
        name_en: (nameEn || nameAr).trim(),
        employee_id: employeeId.trim(),
      },
    });

    if (authCreateError) {
      const { data: listRes } = await adminClient.auth.admin.listUsers();
      const match = listRes?.users?.find((u) => u.email === staffEmail);
      if (match) {
        authUserId = match.id;
      } else {
        return NextResponse.json({ success: false, error: authCreateError.message }, { status: 400 });
      }
    } else {
      authUserId = authData.user.id;
    }

    const insertPayload = {
      id: authUserId,
      organization_id: session.organizationId,
      employee_id: employeeId.trim(),
      name_ar: nameAr.trim(),
      name_en: (nameEn || nameAr).trim(),
      mobile: mobile.trim(),
      department_id: departmentId || null,
      role,
      preferred_language: preferredLanguage,
      is_active: Boolean(isActive),
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert(insertPayload)
      .select(`
        *,
        department:departments(id, code, name_en, name_ar)
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Record audit event
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "create_staff",
      entity_type: "staff",
      entity_id: created.id,
      change_summary: {
        employee_id: created.employee_id,
        name_ar: created.name_ar,
        role: created.role,
      },
    });

    return NextResponse.json({
      success: true,
      staff: created,
      message: "Staff member created successfully",
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

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      employeeId,
      nameAr,
      nameEn,
      mobile,
      departmentId,
      role,
      preferredLanguage,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Staff id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch existing profile
    const { data: oldProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("organization_id", session.organizationId)
      .single();

    if (fetchError || !oldProfile) {
      return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (employeeId !== undefined) updatePayload.employee_id = employeeId.trim();
    if (nameAr !== undefined) updatePayload.name_ar = nameAr.trim();
    if (nameEn !== undefined) updatePayload.name_en = nameEn.trim();
    if (mobile !== undefined) updatePayload.mobile = mobile.trim();
    if (departmentId !== undefined) updatePayload.department_id = departmentId;
    if (role !== undefined) updatePayload.role = role;
    if (preferredLanguage !== undefined) updatePayload.preferred_language = preferredLanguage;
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .eq("organization_id", session.organizationId)
      .select(`
        *,
        department:departments(id, code, name_en, name_ar)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // Record audit event
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: isActive !== undefined && isActive !== oldProfile.is_active ? "toggle_staff_status" : "update_staff",
      entity_type: "staff",
      entity_id: id,
      change_summary: {
        old_values: oldProfile,
        new_values: updated,
      },
    });

    return NextResponse.json({
      success: true,
      staff: updated,
      message: "Staff member updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
