import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { getOrgSettings } from "@/lib/org-settings";

/**
 * GET /api/settings
 *
 * Member-readable view of the tenant's effective operating settings.
 * Unlike /api/admin/settings (admin-gated), this endpoint is available to any
 * authenticated member so the client can enforce privacy mode, WhatsApp
 * templates, partial-search rules and load the tenant's alert types.
 *
 * Only non-sensitive configuration is exposed (no PII, no credentials).
 */
export async function GET() {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const supabase = await createClient();

    const [settings, alertTypesRes, orgRes] = await Promise.all([
      getOrgSettings(supabase, session.organizationId),
      supabase
        .from("parking_alert_types")
        .select("id, code, name_ar, name_en, icon, sort_order, is_active")
        .eq("organization_id", session.organizationId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("organizations")
        .select("name_ar, name_en, logo_url, entity_type, default_language")
        .eq("id", session.organizationId)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      success: true,
      settings,
      alertTypes: alertTypesRes.data || [],
      organization: orgRes.data || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
