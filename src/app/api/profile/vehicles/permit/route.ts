import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const body = await request.json();
    const { vehicleId } = body;

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: "معرف السيارة مطلوب" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify caller ownership or admin/security privileges
    const { data: ownership } = await supabase
      .from("staff_vehicles")
      .select("id")
      .eq("staff_id", session.profile.id)
      .eq("vehicle_id", vehicleId)
      .maybeSingle();

    const isAuthorized = Boolean(ownership) || ["admin", "super_admin", "security"].includes(session.role);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بتدوير تصريح هذه السيارة" },
        { status: 403 }
      );
    }

    // Try RPC first
    const { data: rpcToken, error: rpcError } = await supabase.rpc("rotate_vehicle_permit", {
      p_vehicle_id: vehicleId,
    });

    let newToken = rpcToken;

    if (rpcError || !newToken) {
      // Fallback update
      const generated = crypto.randomUUID();
      const { data: updated, error: updateError } = await supabase
        .from("vehicles")
        .update({
          permit_token: generated,
          permit_status: "active",
          permit_issued_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicleId)
        .eq("organization_id", session.organizationId)
        .select("permit_token")
        .single();

      if (updateError || !updated) {
        return NextResponse.json(
          { success: false, error: updateError?.message || "تعذر تدوير التصريح" },
          { status: 500 }
        );
      }
      newToken = updated.permit_token;
    }

    // Log rotation event
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "ROTATE_PERMIT_TOKEN",
      entity_type: "vehicles",
      entity_id: vehicleId,
      change_summary: {
        event: "permit_token_rotated",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تدوير تصريح الموقف وتحديث ملصق الباركود بنجاح",
      permitToken: newToken,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: "معرف السيارة مطلوب" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify caller ownership or admin/security privileges
    const { data: ownership } = await supabase
      .from("staff_vehicles")
      .select("id")
      .eq("staff_id", session.profile.id)
      .eq("vehicle_id", vehicleId)
      .maybeSingle();

    const isAuthorized = Boolean(ownership) || ["admin", "super_admin", "security"].includes(session.role);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بإلغاء تصريح هذه السيارة" },
        { status: 403 }
      );
    }

    // Revoke permit capability without deactivating the vehicle record
    const { error: revokeError } = await supabase
      .from("vehicles")
      .update({
        permit_status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId)
      .eq("organization_id", session.organizationId);

    if (revokeError) {
      return NextResponse.json({ success: false, error: revokeError.message }, { status: 500 });
    }

    // Log revocation event
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "REVOKE_PERMIT_TOKEN",
      entity_type: "vehicles",
      entity_id: vehicleId,
      change_summary: {
        event: "permit_token_revoked",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم إلغاء تصريح الموقف بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
