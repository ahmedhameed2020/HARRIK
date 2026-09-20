import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";

/**
 * /api/admin/alert-types — tenant alert-type management (§6).
 *
 *  GET    → list all alert types (including inactive)
 *  POST   → create a new alert type
 *  PATCH  → update labels / icon / order / active flag
 *  DELETE → remove an alert type (refused while alerts still reference it)
 *
 * Only admins may manage types. The create-alert UI consumes whichever types
 * are active, falling back to the canonical five when none are configured.
 */

const CODE_RE = /^[A-Z][A-Z0-9_]{2,31}$/;

function normalizeCode(raw: unknown): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
}

export async function GET() {
  try {
    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    const supabase = await createClient();
    const { data, error: listError } = await supabase
      .from("parking_alert_types")
      .select("*")
      .eq("organization_id", session.organizationId)
      .order("sort_order", { ascending: true });

    if (listError) {
      return NextResponse.json({ success: false, error: listError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, alertTypes: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const code = normalizeCode(body?.code);
    const nameAr = String(body?.name_ar || "").trim();
    const nameEn = String(body?.name_en || "").trim();

    if (!CODE_RE.test(code)) {
      return NextResponse.json(
        { success: false, error: "رمز النوع غير صالح (أحرف إنجليزية وأرقام وشرطة سفلية)" },
        { status: 400 }
      );
    }
    if (nameAr.length < 2 && nameEn.length < 2) {
      return NextResponse.json(
        { success: false, error: "اسم نوع التنبيه مطلوب بالعربية أو الإنجليزية" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Unique per organization.
    const { data: existing } = await supabase
      .from("parking_alert_types")
      .select("id")
      .eq("organization_id", session.organizationId)
      .eq("code", code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "يوجد نوع تنبيه بنفس الرمز مسبقاً" },
        { status: 409 }
      );
    }

    const { data: created, error: insertError } = await supabase
      .from("parking_alert_types")
      .insert({
        organization_id: session.organizationId,
        code,
        name_ar: nameAr || nameEn,
        name_en: nameEn || nameAr,
        icon: body?.icon ? String(body.icon).slice(0, 32) : null,
        sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 100,
        is_active: body?.is_active === false ? false : true,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "create_alert_type",
      entity_type: "parking_alert_type",
      entity_id: created.id,
      change_summary: { code, name_ar: created.name_ar },
    });

    return NextResponse.json({ success: true, alertType: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body || {};
    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const patch: Record<string, any> = {};
    if (typeof body.name_ar === "string" && body.name_ar.trim()) patch.name_ar = body.name_ar.trim();
    if (typeof body.name_en === "string" && body.name_en.trim()) patch.name_en = body.name_en.trim();
    if (typeof body.icon === "string") patch.icon = body.icon.slice(0, 32);
    if (Number.isFinite(Number(body.sort_order))) patch.sort_order = Number(body.sort_order);
    if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: "لا توجد حقول للتحديث" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: updated, error: updateError } = await supabase
      .from("parking_alert_types")
      .update(patch)
      .eq("id", id)
      .eq("organization_id", session.organizationId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "update_alert_type",
      entity_type: "parking_alert_type",
      entity_id: id,
      change_summary: patch,
    });

    return NextResponse.json({ success: true, alertType: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Alerts reference types with ON DELETE RESTRICT — explain instead of failing raw.
    const { count } = await supabase
      .from("parking_alerts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", session.organizationId)
      .eq("alert_type_id", id);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لا يمكن حذف نوع مستخدم في تنبيهات قائمة. يمكنك تعطيله بدلاً من ذلك.",
          referencedCount: count,
        },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from("parking_alert_types")
      .delete()
      .eq("id", id)
      .eq("organization_id", session.organizationId);

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "delete_alert_type",
      entity_type: "parking_alert_type",
      entity_id: id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
