import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOnboardingSession } from "@/lib/supabase/onboarding-auth";
import { getOrgSettings } from "@/lib/org-settings";

export async function GET() {
  try {
    const { session, error, status } = await getOnboardingSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    const supabase = await createClient();
    const settings = await getOrgSettings(supabase, session.organizationId);

    const [orgRes, deptRes, staffRes, vehicleRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name_ar, name_en, entity_type, status, onboarding_status, logo_url")
        .eq("id", session.organizationId)
        .single(),
      supabase.from("departments").select("id", { count: "exact", head: true }).eq("organization_id", session.organizationId),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", session.organizationId),
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("organization_id", session.organizationId),
    ]);

    return NextResponse.json({
      success: true,
      organization: orgRes.data,
      settings,
      admin: {
        email: session.email,
        emailVerified: session.emailVerified,
      },
      stats: {
        departments: deptRes.count ?? 0,
        members: staffRes.count ?? 0,
        vehicles: vehicleRes.count ?? 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error, status } = await getOnboardingSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    const body = await request.json();
    const action = body.action || "save_settings";

    const admin = createAdminClient();

    if (action === "save_settings") {
      const { branding, privacy_mode, venue_label, gate_security_phone, custom_whatsapp_template, operating_hours } = body;

      const settingsUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
      if (["mode_a", "mode_b", "mode_c"].includes(privacy_mode)) settingsUpdate.privacy_mode = privacy_mode;

      if (branding || venue_label || gate_security_phone || custom_whatsapp_template || operating_hours) {
        // Merge with existing branding
        const { data: existing } = await admin
          .from("system_settings")
          .select("branding")
          .eq("organization_id", session.organizationId)
          .maybeSingle();

        settingsUpdate.branding = {
          ...((existing?.branding as any) || {}),
          ...(branding || {}),
          ...(venue_label ? { venue_label } : {}),
          ...(gate_security_phone ? { gate_security_phone } : {}),
          ...(custom_whatsapp_template ? { custom_whatsapp_template } : {}),
          ...(operating_hours ? { operating_hours } : {}),
        };
      }

      const { error: updErr } = await admin
        .from("system_settings")
        .update(settingsUpdate)
        .eq("organization_id", session.organizationId);

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      await admin
        .from("organizations")
        .update({ onboarding_status: "settings_configured", updated_at: new Date().toISOString() })
        .eq("id", session.organizationId);

      return NextResponse.json({ success: true, message: "تم حفظ إعدادات المنشأة" });
    }

    if (action === "complete") {
      // §9.5: confirming the address is a required step, not advice. An
      // organization whose only administrator cannot receive mail has no way
      // to reset a password or receive an invitation later.
      if (!session.emailVerified) {
        return NextResponse.json(
          {
            success: false,
            error:
              "يرجى تأكيد بريدك الإلكتروني أولاً عبر الرابط المرسل إليك، ثم أعد المحاولة لتفعيل المنشأة.",
            code: "email_not_verified",
          },
          { status: 400 }
        );
      }

      await admin
        .from("organizations")
        .update({ status: "active", onboarding_status: "ready", updated_at: new Date().toISOString() })
        .eq("id", session.organizationId);

      await admin
        .from("profiles")
        .update({ onboarded_at: new Date().toISOString() })
        .eq("id", session.userId);

      await admin.from("audit_logs").insert({
        organization_id: session.organizationId,
        actor_id: session.userId,
        action: "organization_onboarding_completed",
        entity_type: "organization",
        entity_id: session.organizationId,
      });

      return NextResponse.json({
        success: true,
        status: "active",
        message: "تم تفعيل المنشأة بنجاح! يمكنك الآن البدء باستخدام النظام.",
      });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
