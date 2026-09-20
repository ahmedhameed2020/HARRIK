import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { normalizePlateNumber } from "@/lib/plate-normalizer";
import { parsePagination, sanitizeTerm, computeHasMore } from "@/lib/api/query";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    if (session.role !== "admin" && session.role !== "super_admin" && session.role !== "security") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createClient();

    // Server-side search, filtering and pagination.
    const { searchParams } = new URL(request.url);
    const term = sanitizeTerm(searchParams.get("q"));
    const statusFilter = searchParams.get("status") || "ALL";
    const { limit, offset } = parsePagination(searchParams);

    // PostgREST cannot OR across a two-level embedded resource, so owner-name
    // matches are pre-resolved to vehicle ids in two steps.
    let ownerVehicleIds: string[] = [];
    if (term) {
      const { data: owners } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", session.organizationId)
        .or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%,employee_id.ilike.%${term}%`)
        .limit(200);

      const ownerIds = (owners || []).map((p: any) => p.id);
      if (ownerIds.length > 0) {
        const { data: sv } = await supabase
          .from("staff_vehicles")
          .select("vehicle_id")
          .eq("organization_id", session.organizationId)
          .in("staff_id", ownerIds)
          .limit(500);
        ownerVehicleIds = (sv || []).map((r: any) => r.vehicle_id);
      }
    }

    let query = supabase
      .from("vehicles")
      .select(`
        *,
        staff_vehicles:staff_vehicles(
          id,
          is_primary,
          staff:profiles(id, employee_id, name_ar, name_en, mobile, department:departments(name_ar, name_en))
        )
      `)
      .eq("organization_id", session.organizationId);

    if (statusFilter === "ACTIVE") query = query.eq("is_active", true);
    if (statusFilter === "INACTIVE") query = query.eq("is_active", false);

    if (term) {
      const norm = normalizePlateNumber(term) || term;
      const branches = [
        `plate_number.ilike.%${term}%`,
        `normalized_plate.ilike.%${norm}%`,
        `make.ilike.%${term}%`,
        `model.ilike.%${term}%`,
      ];
      if (ownerVehicleIds.length > 0) {
        branches.push(`id.in.(${ownerVehicleIds.join(",")})`);
      }
      query = query.or(branches.join(","));
    }

    query = query.order("created_at", { ascending: false });
    if (limit !== null) query = query.range(offset, offset + limit - 1);

    const { data: vehicles, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Format for easy display
    const formatted = (vehicles || []).map((v: any) => {
      const staffRel = v.staff_vehicles?.[0];
      return {
        id: v.id,
        plate_number: v.plate_number,
        normalized_plate: v.normalized_plate,
        make: v.make,
        model: v.model,
        color: v.color,
        year: v.year,
        is_active: v.is_active,
        owner_id: staffRel?.staff?.id || null,
        owner_name_ar: staffRel?.staff?.name_ar || null,
        owner_name_en: staffRel?.staff?.name_en || null,
        owner_dept: staffRel?.staff?.department?.name_ar || null,
        owner_dept_en: staffRel?.staff?.department?.name_en || null,
        owner_mobile: staffRel?.staff?.mobile || null,
        is_primary: staffRel?.is_primary ?? true,
      };
    });

    return NextResponse.json({
      success: true,
      vehicles: formatted,
      hasMore: computeHasMore(vehicles, limit),
      limit,
      offset,
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

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      plateNumber,
      make,
      model,
      color,
      year,
      ownerId,
      isPrimary = true,
      isActive = true,
    } = body;

    if (!plateNumber || !make || !model) {
      return NextResponse.json(
        { success: false, error: "plateNumber, make, and model are required" },
        { status: 400 }
      );
    }

    // Arabic digits normalization: e.g. ٤٨٢٧٣١ -> 482731
    const normalizedPlate = normalizePlateNumber(plateNumber);

    if (normalizedPlate.length < 2 || normalizedPlate.length > 8) {
      return NextResponse.json(
        { success: false, error: "Plate number must contain between 2 and 8 digits" },
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
        { success: false, error: "Vehicle plate already exists in this organization" },
        { status: 409 }
      );
    }

    const newVehicleId = crypto.randomUUID();

    const { data: createdVehicle, error: insertVehicleError } = await supabase
      .from("vehicles")
      .insert({
        id: newVehicleId,
        organization_id: session.organizationId,
        plate_number: plateNumber.trim(),
        normalized_plate: normalizedPlate,
        make: make.trim(),
        model: model.trim(),
        color: (color || "White").trim(),
        year: year ? parseInt(year, 10) : null,
        is_active: Boolean(isActive),
      })
      .select()
      .single();

    if (insertVehicleError) {
      return NextResponse.json({ success: false, error: insertVehicleError.message }, { status: 500 });
    }

    // Assign owner if provided
    if (ownerId) {
      if (isPrimary) {
        // Demote existing primary vehicles for this owner
        await supabase
          .from("staff_vehicles")
          .update({ is_primary: false })
          .eq("organization_id", session.organizationId)
          .eq("staff_id", ownerId);
      }

      await supabase.from("staff_vehicles").insert({
        organization_id: session.organizationId,
        staff_id: ownerId,
        vehicle_id: newVehicleId,
        is_primary: Boolean(isPrimary),
      });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "create_vehicle",
      entity_type: "vehicle",
      entity_id: newVehicleId,
      change_summary: {
        plate_number: plateNumber,
        normalized_plate: normalizedPlate,
        owner_id: ownerId,
      },
    });

    return NextResponse.json({
      success: true,
      vehicle: createdVehicle,
      message: "Vehicle added successfully",
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

    if (session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      plateNumber,
      make,
      model,
      color,
      year,
      ownerId,
      isPrimary,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Vehicle id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch existing vehicle
    const { data: oldVehicle, error: fetchError } = await supabase
      .from("vehicles")
      .select("*, staff_vehicles(*)")
      .eq("id", id)
      .eq("organization_id", session.organizationId)
      .single();

    if (fetchError || !oldVehicle) {
      return NextResponse.json({ success: false, error: "Vehicle not found" }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (plateNumber !== undefined) {
      updatePayload.plate_number = plateNumber.trim();
      updatePayload.normalized_plate = normalizePlateNumber(plateNumber);
    }
    if (make !== undefined) updatePayload.make = make.trim();
    if (model !== undefined) updatePayload.model = model.trim();
    if (color !== undefined) updatePayload.color = color.trim();
    if (year !== undefined) updatePayload.year = year ? parseInt(year, 10) : null;
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);

    const { data: updatedVehicle, error: updateVehicleError } = await supabase
      .from("vehicles")
      .update(updatePayload)
      .eq("id", id)
      .eq("organization_id", session.organizationId)
      .select()
      .single();

    if (updateVehicleError) {
      return NextResponse.json({ success: false, error: updateVehicleError.message }, { status: 500 });
    }

    // Owner assignment / reassignment
    let reassigned = false;
    if (ownerId !== undefined) {
      // Remove old association
      await supabase
        .from("staff_vehicles")
        .delete()
        .eq("organization_id", session.organizationId)
        .eq("vehicle_id", id);

      if (ownerId) {
        if (isPrimary) {
          await supabase
            .from("staff_vehicles")
            .update({ is_primary: false })
            .eq("organization_id", session.organizationId)
            .eq("staff_id", ownerId);
        }

        await supabase.from("staff_vehicles").insert({
          organization_id: session.organizationId,
          staff_id: ownerId,
          vehicle_id: id,
          is_primary: isPrimary ?? true,
        });
        reassigned = true;
      }
    }

    // Record audit event
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: reassigned ? "reassign_vehicle" : "update_vehicle",
      entity_type: "vehicle",
      entity_id: id,
      change_summary: {
        old_values: oldVehicle,
        new_values: updatedVehicle,
      },
    });

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle,
      message: "Vehicle updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
