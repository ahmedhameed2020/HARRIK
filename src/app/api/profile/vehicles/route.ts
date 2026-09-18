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

    const supabase = await createClient();
    const { data: staffVehicles, error } = await supabase
      .from("staff_vehicles")
      .select(`
        id,
        is_primary,
        created_at,
        vehicle:vehicles(*)
      `)
      .eq("staff_id", session.profile.id)
      .eq("organization_id", session.organizationId)
      .order("is_primary", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const formatted = (staffVehicles || []).map((sv: any) => ({
      staff_vehicle_id: sv.id,
      is_primary: sv.is_primary,
      ...sv.vehicle,
    }));

    return NextResponse.json({ success: true, vehicles: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const body = await request.json();
    const { plateNumber, make, model, color, year, isPrimary = true } = body;

    if (!plateNumber || !make || !model) {
      return NextResponse.json(
        { success: false, error: "رقم اللوحة، والشركة، والموديل مطلوبة" },
        { status: 400 }
      );
    }

    const normalizedPlate = normalizePlateNumber(plateNumber);
    if (normalizedPlate.length < 2 || normalizedPlate.length > 8) {
      return NextResponse.json(
        { success: false, error: "رقم اللوحة يجب أن يتكون من 2 إلى 8 أرقام" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check duplicate plate in organization
    const { data: existing } = await supabase
      .from("vehicles")
      .select("id")
      .eq("organization_id", session.organizationId)
      .eq("normalized_plate", normalizedPlate)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "رقم اللوحة مسجل مسبقاً في هذه المنشأة" },
        { status: 409 }
      );
    }

    const newVehicleId = crypto.randomUUID();

    // If setting as primary, reset existing primaries for this user
    if (isPrimary) {
      await supabase
        .from("staff_vehicles")
        .update({ is_primary: false })
        .eq("staff_id", session.profile.id);
    }

    // Insert vehicle
    const { data: createdVehicle, error: insertVehicleError } = await supabase
      .from("vehicles")
      .insert({
        id: newVehicleId,
        organization_id: session.organizationId,
        plate_number: plateNumber.trim(),
        normalized_plate: normalizedPlate,
        make: make.trim(),
        model: model.trim(),
        color: (color || "أبيض").trim(),
        year: year ? parseInt(year, 10) : null,
        is_active: true,
      })
      .select()
      .single();

    if (insertVehicleError) {
      return NextResponse.json({ success: false, error: insertVehicleError.message }, { status: 500 });
    }

    // Link vehicle to current user in staff_vehicles
    const { data: linkData, error: linkError } = await supabase
      .from("staff_vehicles")
      .insert({
        organization_id: session.organizationId,
        staff_id: session.profile.id,
        vehicle_id: newVehicleId,
        is_primary: Boolean(isPrimary),
      })
      .select()
      .single();

    if (linkError) {
      return NextResponse.json({ success: false, error: linkError.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "add_own_vehicle",
      entity_type: "vehicle",
      entity_id: newVehicleId,
      details: { plate_number: plateNumber, make, model },
    });

    return NextResponse.json({
      success: true,
      vehicle: {
        staff_vehicle_id: linkData.id,
        is_primary: linkData.is_primary,
        ...createdVehicle,
      },
      message: "تمت إضافة السيارة بنجاح إلى ملفك الشخصي",
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
    const { vehicleId, make, model, color, year, isPrimary } = body;

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: "معرف السيارة مطلوب" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify ownership
    const { data: ownership, error: ownerError } = await supabase
      .from("staff_vehicles")
      .select("id, is_primary")
      .eq("staff_id", session.profile.id)
      .eq("vehicle_id", vehicleId)
      .maybeSingle();

    if (ownerError || !ownership) {
      return NextResponse.json({ success: false, error: "غير مصرح لك بتعديل هذه السيارة" }, { status: 403 });
    }

    // Update vehicle attributes
    const updateVehiclePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (make) updateVehiclePayload.make = make.trim();
    if (model) updateVehiclePayload.model = model.trim();
    if (color) updateVehiclePayload.color = color.trim();
    if (year !== undefined) updateVehiclePayload.year = year ? parseInt(year, 10) : null;

    await supabase.from("vehicles").update(updateVehiclePayload).eq("id", vehicleId);

    // Update is_primary if specified
    if (isPrimary !== undefined && isPrimary !== ownership.is_primary) {
      if (isPrimary) {
        await supabase
          .from("staff_vehicles")
          .update({ is_primary: false })
          .eq("staff_id", session.profile.id);
      }

      await supabase
        .from("staff_vehicles")
        .update({ is_primary: Boolean(isPrimary) })
        .eq("id", ownership.id);
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات السيارة بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("id");

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: "معرف السيارة مطلوب" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify ownership
    const { data: ownership } = await supabase
      .from("staff_vehicles")
      .select("id")
      .eq("staff_id", session.profile.id)
      .eq("vehicle_id", vehicleId)
      .maybeSingle();

    if (!ownership) {
      return NextResponse.json({ success: false, error: "غير مصرح بحذف هذه السيارة" }, { status: 403 });
    }

    // Delete relation and deactivate vehicle
    await supabase.from("staff_vehicles").delete().eq("id", ownership.id);
    await supabase.from("vehicles").update({ is_active: false }).eq("id", vehicleId);

    return NextResponse.json({
      success: true,
      message: "تمت إزالة السيارة من ملفك بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
