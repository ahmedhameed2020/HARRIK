import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const supabase = await createClient();

    // Fetch verified profile with organization and department
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, department:departments(*), organization:organizations(*)")
      .eq("id", session.profile.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    // Fetch vehicles belonging to this user via staff_vehicles
    const { data: staffVehicles, error: vehiclesError } = await supabase
      .from("staff_vehicles")
      .select(`
        id,
        is_primary,
        vehicle:vehicles(*)
      `)
      .eq("staff_id", session.profile.id)
      .eq("organization_id", session.organizationId)
      .order("is_primary", { ascending: false });

    const formattedVehicles = (staffVehicles || []).map((sv: any) => ({
      staff_vehicle_id: sv.id,
      is_primary: sv.is_primary,
      ...sv.vehicle,
    }));

    return NextResponse.json({
      success: true,
      profile,
      vehicles: formattedVehicles,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const body = await request.json();
    const { mobile, name_ar, name_en, preferred_language } = body;

    const supabase = await createClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (mobile !== undefined) {
      const cleanMobile = mobile.trim();
      if (cleanMobile.length < 8) {
        return NextResponse.json({ success: false, error: "رقم الجوال غير صالح" }, { status: 400 });
      }
      updatePayload.mobile = cleanMobile;
    }

    if (name_ar !== undefined && name_ar.trim()) {
      updatePayload.name_ar = name_ar.trim();
    }

    if (name_en !== undefined && name_en.trim()) {
      updatePayload.name_en = name_en.trim();
    }

    if (preferred_language && ["ar", "en"].includes(preferred_language)) {
      updatePayload.preferred_language = preferred_language;
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", session.profile.id)
      .select("*, department:departments(*), organization:organizations(*)")
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // Log in audit_logs
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "update_profile",
      entity_type: "profile",
      entity_id: session.profile.id,
      details: { updated_fields: Object.keys(updatePayload) },
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: "تم تحديث الملف الشخصي بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
