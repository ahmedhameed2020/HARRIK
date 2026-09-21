import { NextRequest, NextResponse } from "next/server";
import { MIN_RETENTION_DAYS, MAX_RETENTION_DAYS } from "@/lib/retention/purge";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const supabase = await createClient();

    // 1. Fetch organization profile
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", session.organizationId)
      .single();

    if (orgError) {
      return NextResponse.json({ success: false, error: orgError.message }, { status: 500 });
    }

    // 2. Fetch or initialize system settings
    let { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("*")
      .eq("organization_id", session.organizationId)
      .single();

    if (!settings) {
      // Create default settings if not yet present
      const { data: createdSettings } = await supabase
        .from("system_settings")
        .insert({
          organization_id: session.organizationId,
          privacy_mode: "mode_a",
          partial_search_enabled: true,
          min_partial_digits: 3,
          default_language: "ar",
          whatsapp_enabled: true,
          country_calling_code: "+974",
          branding: {
            entity_type: "other",
            venue_label: "المنشأة",
            primary_color: "#8A1538",
            custom_whatsapp_template: "السلام عليكم، سيارتك رقم {plate} متوقفة أمام سيارتي وتغلق المسار في مواقف {venue_name}. يرجى التكرم بتحريكها شاكراً لتعاونكم.",
            operating_hours: { start: "07:00", end: "16:00", peak: "13:00" },
            gate_security_phone: "+974 4400 0000",
          },
        })
        .select("*")
        .single();
      settings = createdSettings;
    }

    // 3. Fetch alert types
    const { data: alertTypes } = await supabase
      .from("parking_alert_types")
      .select("*")
      .eq("organization_id", session.organizationId)
      .order("sort_order", { ascending: true });

    // 4. Fetch entity metrics counts
    const [staffCount, vehiclesCount, deptsCount] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", session.organizationId),
      supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", session.organizationId),
      supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", session.organizationId),
    ]);

    return NextResponse.json({
      success: true,
      organization,
      settings,
      alertTypes: alertTypes || [],
      stats: {
        totalStaff: staffCount.count ?? 0,
        totalVehicles: vehiclesCount.count ?? 0,
        totalDepartments: deptsCount.count ?? 0,
      },
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

    // Strict Authorization: Only admin or super_admin can change organization settings
    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin privileges required to update settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name_ar,
      name_en,
      country_code,
      timezone,
      default_language,
      logo_url,
      privacy_mode,
      partial_search_enabled,
      min_partial_digits,
      whatsapp_enabled,
      country_calling_code,
      branding,
      retention_days,
    } = body;

    // Validate essential organization name
    if (!name_ar || name_ar.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "اسم المنشأة بالعربية مطلوب ولا يقل عن حرفين" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Update organizations table
    const orgUpdatePayload: Record<string, any> = {
      name_ar: name_ar.trim(),
      name_en: (name_en && name_en.trim()) || name_ar.trim(),
      country_code: country_code || "QA",
      timezone: timezone || "Asia/Qatar",
      default_language: default_language === "en" ? "en" : "ar",
      updated_at: new Date().toISOString(),
    };

    if (logo_url !== undefined) {
      orgUpdatePayload.logo_url = logo_url;
    }

    const { data: updatedOrg, error: orgUpdateError } = await supabase
      .from("organizations")
      .update(orgUpdatePayload)
      .eq("id", session.organizationId)
      .select("*")
      .single();

    if (orgUpdateError) {
      return NextResponse.json({ success: false, error: orgUpdateError.message }, { status: 500 });
    }

    // 2. Update system_settings table
    const settingsUpdatePayload: Record<string, any> = {
      privacy_mode: ["mode_a", "mode_b", "mode_c"].includes(privacy_mode) ? privacy_mode : "mode_a",
      partial_search_enabled: typeof partial_search_enabled === "boolean" ? partial_search_enabled : true,
      min_partial_digits: Number(min_partial_digits) >= 2 && Number(min_partial_digits) <= 6 ? Number(min_partial_digits) : 3,
      whatsapp_enabled: typeof whatsapp_enabled === "boolean" ? whatsapp_enabled : true,
      country_calling_code: country_calling_code || "+974",
      default_language: default_language === "en" ? "en" : "ar",
      updated_at: new Date().toISOString(),
    };

    // How long the search / contact event logs are kept before the nightly
    // purge expires them (lib/retention/purge.ts). Clamped so a stray 0 cannot
    // be read as "delete everything".
    if (retention_days !== undefined) {
      const days = Number(retention_days);
      if (!Number.isFinite(days) || days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) {
        return NextResponse.json(
          {
            success: false,
            error: `مدة الاحتفاظ يجب أن تكون بين ${MIN_RETENTION_DAYS} و${MAX_RETENTION_DAYS} يوماً`,
          },
          { status: 400 }
        );
      }
      settingsUpdatePayload.retention_days = Math.floor(days);
    }

    if (branding && typeof branding === "object") {
      settingsUpdatePayload.branding = branding;
    }

    // 2. Check if system_settings row exists, then update or insert
    const { data: existingSettings } = await supabase
      .from("system_settings")
      .select("id")
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    let updatedSettings = null;
    let settingsUpdateError = null;

    if (existingSettings) {
      const res = await supabase
        .from("system_settings")
        .update(settingsUpdatePayload)
        .eq("organization_id", session.organizationId)
        .select("*")
        .single();
      updatedSettings = res.data;
      settingsUpdateError = res.error;
    } else {
      const res = await supabase
        .from("system_settings")
        .insert({
          organization_id: session.organizationId,
          ...settingsUpdatePayload,
        })
        .select("*")
        .single();
      updatedSettings = res.data;
      settingsUpdateError = res.error;
    }

    if (settingsUpdateError) {
      return NextResponse.json({ success: false, error: settingsUpdateError.message }, { status: 500 });
    }

    // 3. Write immutable audit log
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "update_settings",
      entity_type: "organization",
      entity_id: session.organizationId,
      change_summary: {
        organization_name_ar: orgUpdatePayload.name_ar,
        organization_name_en: orgUpdatePayload.name_en,
        entity_type: branding?.entity_type,
        privacy_mode: settingsUpdatePayload.privacy_mode,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم حفظ إعدادات وهوية المنشأة بنجاح",
      organization: updatedOrg,
      settings: updatedSettings,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
