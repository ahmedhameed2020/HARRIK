import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseConfigError, configErrorMessageAr } from "@/lib/supabase/env";
import { clientIp, enforceRateLimit, verifyTurnstile } from "@/lib/security/rate-limit";

const ENTITY_TYPES = [
  "educational",
  "commercial_tower",
  "residential_complex",
  "corporate",
  "government",
  "healthcare",
  "mall",
  "other",
];

const DEFAULT_ALERT_TYPES = [
  { code: "BLOCKING", name_ar: "سيارتك حاجزة سيارتي", name_en: "Blocking my vehicle", icon: "car", sort_order: 1 },
  { code: "LIGHTS_ON", name_ar: "أنوار السيارة مفتوحة", name_en: "Lights are on", icon: "lightbulb", sort_order: 2 },
  { code: "WINDOW_OPEN", name_ar: "نافذة السيارة مفتوحة", name_en: "Window is open", icon: "window", sort_order: 3 },
  { code: "CHECK_VEHICLE", name_ar: "يرجى التوجه للسيارة", name_en: "Check your vehicle", icon: "alert", sort_order: 4 },
  { code: "CONTACT_ME", name_ar: "يرجى التواصل معي", name_en: "Please contact me", icon: "phone", sort_order: 5 },
];

// Durable, cross-instance throttling lives in the database
// (claim_rate_limit_slot). See lib/security/rate-limit.ts.
const SIGNUP_WINDOW_SECONDS = 300; // 5 minutes
const SIGNUP_MAX_PER_WINDOW = 2;

function isStrongEnough(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.ALLOW_SELF_SERVE_ONBOARDING === "false") {
      return NextResponse.json(
        { success: false, error: "التسجيل الذاتي للمنشآت غير مفعّل حالياً. يرجى التواصل مع إدارة المنصة." },
        { status: 403 }
      );
    }

    const ip = clientIp(request);
    const admin = createAdminClient();

    // Layer 1 — durable IP throttle (survives restarts, shared across isolates)
    const limited = await enforceRateLimit(
      admin as any,
      "register:ip",
      ip,
      SIGNUP_WINDOW_SECONDS,
      SIGNUP_MAX_PER_WINDOW
    );
    if (!limited.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "تم استلام طلبات تسجيل حديثة من هذا الجهاز. يرجى المحاولة بعد بضع دقائق.",
          retryAfter: SIGNUP_WINDOW_SECONDS,
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Layer 2 — optional bot challenge (only enforced when configured)
    const turnstile = await verifyTurnstile(body?.turnstileToken, ip);
    if (!turnstile.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "تعذّر التحقق من كونك مستخدماً حقيقياً. يرجى إعادة المحاولة.",
        },
        { status: 403 }
      );
    }

    const {
      orgNameAr,
      orgNameEn,
      entityType = "other",
      countryCode = "QA",
      timezone = "Asia/Qatar",
      adminNameAr,
      adminNameEn,
      email,
      mobile,
      password,
      venueLabel,
      primaryColor = "#8A1538",
      privacyMode = "mode_a",
      gateSecurityPhone = "+974 4400 0000",
      whatsappTemplate,
    } = body || {};

    // Validation
    const errors: string[] = [];
    if (!orgNameAr || String(orgNameAr).trim().length < 2) errors.push("اسم المنشأة بالعربية مطلوب");
    if (!adminNameAr || String(adminNameAr).trim().length < 2) errors.push("اسم مدير المنشأة مطلوب");
    if (!email || !String(email).includes("@")) errors.push("البريد الإلكتروني غير صالح");
    if (!mobile || String(mobile).replace(/\D/g, "").length < 8) errors.push("رقم الجوال غير صالح");
    if (!isStrongEnough(password)) errors.push("كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن حرفاً ورقماً");
    if (!ENTITY_TYPES.includes(entityType)) errors.push("نوع المنشأة غير صالح");
    if (!["mode_a", "mode_b", "mode_c"].includes(privacyMode)) errors.push("وضع الخصوصية غير صالح");

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors[0], errors }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Create the tenant admin auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name_ar: String(adminNameAr).trim(),
        name_en: String(adminNameEn || adminNameAr).trim(),
      },
    });

    if (authError || !authData?.user) {
      const already = (authError?.message || "").toLowerCase().includes("already");
      return NextResponse.json(
        {
          success: false,
          error: already
            ? "هذا البريد الإلكتروني مسجّل مسبقاً. يرجى تسجيل الدخول بدلاً من إنشاء منشأة جديدة."
            : authError?.message || "تعذّر إنشاء حساب المدير",
        },
        { status: 400 }
      );
    }

    const adminUserId = authData.user.id;

    // Create the organization in onboarding status
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        name_ar: String(orgNameAr).trim(),
        name_en: String(orgNameEn || orgNameAr).trim(),
        country_code: countryCode || "QA",
        timezone: timezone || "Asia/Qatar",
        default_language: "ar",
        entity_type: ENTITY_TYPES.includes(entityType) ? entityType : "other",
        status: "onboarding",
        onboarding_status: "admin_assigned",
      })
      .select("id")
      .single();

    if (orgError || !org) {
      // roll back the orphan auth user
      await admin.auth.admin.deleteUser(adminUserId).catch(() => {});
      return NextResponse.json({ success: false, error: orgError?.message || "تعذّر إنشاء المنشأة" }, { status: 500 });
    }

    const organizationId = org.id;

    // Create the admin profile
    const { error: profileError } = await admin.from("profiles").insert({
      id: adminUserId,
      organization_id: organizationId,
      employee_id: "ADMIN-1",
      name_ar: String(adminNameAr).trim(),
      name_en: String(adminNameEn || adminNameAr).trim(),
      mobile: String(mobile).trim(),
      role: "admin",
      preferred_language: "ar",
      is_active: true,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(adminUserId).catch(() => {});
      await admin.from("organizations").delete().eq("id", organizationId);
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    // Default system settings + branding
    await admin.from("system_settings").insert({
      organization_id: organizationId,
      privacy_mode: privacyMode,
      partial_search_enabled: true,
      min_partial_digits: 3,
      default_language: "ar",
      whatsapp_enabled: true,
      country_calling_code: "+974",
      branding: {
        entity_type: entityType,
        venue_label: venueLabel || String(orgNameAr).trim(),
        primary_color: primaryColor,
        custom_whatsapp_template:
          whatsappTemplate ||
          "السلام عليكم، سيارتك رقم {plate} متوقفة أمام سيارتي وتغلق المسار في مواقف {venue_name}. يرجى التكرم بتحريكها شاكراً لتعاونكم.",
        operating_hours: { start: "07:00", end: "16:00", peak: "13:00" },
        gate_security_phone: gateSecurityPhone,
      },
    });

    // Default alert types
    await admin.from("parking_alert_types").insert(
      DEFAULT_ALERT_TYPES.map((t) => ({ ...t, organization_id: organizationId, is_active: true }))
    );

    // Audit
    await admin.from("audit_logs").insert({
      organization_id: organizationId,
      actor_id: adminUserId,
      action: "organization_onboarding_started",
      entity_type: "organization",
      entity_id: organizationId,
      change_summary: { name_ar: orgNameAr, entity_type: entityType },
    });

    return NextResponse.json({
      success: true,
      organizationId,
      message: "تم إنشاء المنشأة بنجاح. يمكنك تسجيل الدخول لإكمال الإعداد.",
    });
  } catch (err: any) {
    // A deployment missing its Supabase secrets used to reach Supabase with a
    // placeholder and come back as "Invalid API key" — an error that sends the
    // reader looking for a wrong key rather than an unset one. Name the
    // variables instead, and answer 503: the request was fine, the deployment
    // is not.
    if (err instanceof SupabaseConfigError) {
      console.error(`[harrik] registration blocked: ${err.message}`);
      return NextResponse.json(
        { success: false, error: configErrorMessageAr(err.missing), missing: err.missing },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
