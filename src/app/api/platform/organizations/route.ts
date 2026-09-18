import { NextRequest, NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { session, error, status } = await getPlatformSession();
  if (!session || !session.isPlatformAdmin) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
  }

  const supabase = await createClient();
  const { data, error: rpcError } = await supabase.rpc("get_platform_organizations_overview");

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ organizations: data || [] });
}

export async function POST(req: NextRequest) {
  const { session, error, status } = await getPlatformSession();
  if (!session || !session.isPlatformAdmin) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { name_en, name_ar, entity_type = "other", default_language = "ar", timezone = "Asia/Qatar" } = body;

    if (!name_en || !name_ar) {
      return NextResponse.json(
        { error: "Organization name in English and Arabic are required" },
        { status: 400 }
      );
    }

    const validEntityTypes = [
      "educational",
      "commercial_tower",
      "residential_complex",
      "corporate",
      "government",
      "healthcare",
      "mall",
      "other",
    ];

    if (!validEntityTypes.includes(entity_type)) {
      return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
    }

    const supabase = await createClient();

    // New tenant begins strictly with status = 'onboarding' and onboarding_status = 'organization_created'
    const { data: newOrg, error: insertError } = await supabase
      .from("organizations")
      .insert({
        name_en,
        name_ar,
        entity_type,
        status: "onboarding",
        onboarding_status: "organization_created",
        default_language,
        timezone,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Platform audit log
    await supabase.from("platform_audit_logs").insert({
      action: "platform.organization.created",
      actor_id: session.userId,
      entity_type: "organization",
      entity_id: newOrg.id,
      change_summary: {
        name_en,
        name_ar,
        entity_type,
        status: "onboarding",
      },
    });

    return NextResponse.json({ success: true, organization: newOrg }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Bad Request" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, error, status } = await getPlatformSession();
  if (!session || !session.isPlatformAdmin) {
    return NextResponse.json({ error: error || "Forbidden" }, { status: status || 403 });
  }

  try {
    const body = await req.json();
    const { organizationId, status: newStatus } = body;

    if (!organizationId || !newStatus) {
      return NextResponse.json(
        { error: "organizationId and status are required" },
        { status: 400 }
      );
    }

    if (!["onboarding", "active", "suspended", "archived"].includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("set_organization_status", {
      p_organization_id: organizationId,
      p_status: newStatus,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, organizationId, status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Bad Request" }, { status: 400 });
  }
}
