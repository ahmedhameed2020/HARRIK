import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { normalizePlateNumber } from "@/lib/plate-normalizer";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get("status") || "all";
    const searchQuery = searchParams.get("q")?.trim();

    const supabase = await createClient();
    let query = supabase
      .from("visitor_passes")
      .select("*")
      .eq("organization_id", session.organizationId)
      .order("created_at", { ascending: false });

    if (filterStatus === "active") {
      query = query
        .eq("status", "active")
        .gt("valid_until", new Date().toISOString());
    } else if (filterStatus === "expired") {
      query = query.or(`status.eq.expired,valid_until.lte.${new Date().toISOString()}`);
    }

    if (searchQuery) {
      const norm = normalizePlateNumber(searchQuery);
      query = query.or(`plate_number.ilike.%${searchQuery}%,normalized_plate.ilike.%${norm}%,visitor_name.ilike.%${searchQuery}%,visitor_mobile.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      passes: data || [],
    });
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

    // Role check: Only admin, super_admin or security can issue visitor passes
    if (!["admin", "super_admin", "security"].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: "غير مصرح: يتطلب صلاحيات أمن أو إدارة لإصدار تصاريح الزوار" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      plateNumber,
      visitorName,
      visitorMobile,
      vehicleMake = "تويوتا",
      vehicleModel = "",
      vehicleColor = "أبيض",
      hostName = "",
      purpose = "زيارة عمل / مراجع",
      validHours = 8,
    } = body;

    if (!plateNumber || !visitorName || !visitorMobile) {
      return NextResponse.json(
        { success: false, error: "رقم اللوحة، اسم الزائر، ورقم الهاتف مطلوبة" },
        { status: 400 }
      );
    }

    const normalizedPlate = normalizePlateNumber(plateNumber);
    const now = new Date();
    const validUntil = new Date(now.getTime() + Number(validHours) * 60 * 60 * 1000).toISOString();

    const supabase = await createClient();

    const insertPayload = {
      organization_id: session.organizationId,
      plate_number: plateNumber.trim(),
      normalized_plate: normalizedPlate,
      visitor_name: visitorName.trim(),
      visitor_mobile: visitorMobile.trim(),
      vehicle_make: vehicleMake.trim(),
      vehicle_model: vehicleModel.trim(),
      vehicle_color: vehicleColor.trim(),
      host_name: hostName.trim(),
      purpose: purpose.trim(),
      issued_by: session.profile.id,
      valid_from: now.toISOString(),
      valid_until: validUntil,
      status: "active",
    };

    const { data, error } = await supabase
      .from("visitor_passes")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "CREATE_VISITOR_PASS",
      entity_type: "visitor_passes",
      entity_id: data.id,
      details: {
        plate: plateNumber,
        visitor: visitorName,
        valid_until: validUntil,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم إصدار تصريح الموقف المؤقت بنجاح",
      pass: data,
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

    if (!["admin", "super_admin", "security"].includes(session.role)) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 403 });
    }

    const body = await request.json();
    const { passId, status, extendHours } = body;

    if (!passId) {
      return NextResponse.json({ success: false, error: "passId مطلوب" }, { status: 400 });
    }

    const supabase = await createClient();

    const updatePayload: Record<string, any> = {};
    if (status) {
      updatePayload.status = status;
    }
    if (extendHours) {
      const newUntil = new Date(Date.now() + Number(extendHours) * 60 * 60 * 1000).toISOString();
      updatePayload.valid_until = newUntil;
      updatePayload.status = "active";
    }

    const { data, error } = await supabase
      .from("visitor_passes")
      .update(updatePayload)
      .eq("id", passId)
      .eq("organization_id", session.organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث التصريح بنجاح",
      pass: data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    if (!["admin", "super_admin", "security"].includes(session.role)) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const passId = searchParams.get("id");

    if (!passId) {
      return NextResponse.json({ success: false, error: "passId مطلوب" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("visitor_passes")
      .delete()
      .eq("id", passId)
      .eq("organization_id", session.organizationId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف التصريح بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
