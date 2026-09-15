import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ParkingAlert } from "@/types";

// In-memory state store for active alerts with initial seed records
const SEED_ALERTS: ParkingAlert[] = [
  {
    id: "50000000-0000-0000-0000-000000000001",
    organization_id: "00000000-0000-0000-0000-000000000001",
    vehicle_id: "40000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000001",
    reporter_id: "30000000-0000-0000-0000-000000000002",
    alert_type_id: "20000000-0000-0000-0000-000000000001",
    status: "resolved",
    message: "سيارتك حاجزة سيارة المعلم",
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    acknowledged_at: new Date(Date.now() - 3.9 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 3.8 * 3600 * 1000).toISOString(),
  },
  {
    id: "50000000-0000-0000-0000-000000000002",
    organization_id: "00000000-0000-0000-0000-000000000001",
    vehicle_id: "40000000-0000-0000-0000-000000000004",
    owner_id: "30000000-0000-0000-0000-000000000002",
    reporter_id: "30000000-0000-0000-0000-000000000003",
    alert_type_id: "20000000-0000-0000-0000-000000000002",
    status: "acknowledged",
    message: "الأنوار مفتوحة في المواقف الجنوبية",
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    acknowledged_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolved_at: null,
  },
  {
    id: "50000000-0000-0000-0000-000000000003",
    organization_id: "00000000-0000-0000-0000-000000000001",
    vehicle_id: "40000000-0000-0000-0000-000000000009",
    owner_id: "30000000-0000-0000-0000-000000000008",
    reporter_id: "30000000-0000-0000-0000-000000000001",
    alert_type_id: "20000000-0000-0000-0000-000000000001",
    status: "pending",
    message: "حاجز سيارة التربية الإسلامية",
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    acknowledged_at: null,
    resolved_at: null,
  },
];

let runtimeAlerts = [...SEED_ALERTS];

export async function GET() {
  try {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("parking_alerts")
        .select(`
          *,
          vehicle:vehicles(plate_number, make, model, color),
          owner:profiles!parking_alerts_owner_id_fkey(name_ar, name_en, mobile, employee_id),
          alert_type:parking_alert_types(code, name_ar, name_en)
        `)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, alerts: data });
      }
    } catch {
      // Fallback to runtime alerts
    }

    return NextResponse.json({ success: true, alerts: runtimeAlerts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicleId, ownerId, alertTypeCode, message, plateNumber } = body;

    const newAlert: ParkingAlert = {
      id: crypto.randomUUID(),
      organization_id: "00000000-0000-0000-0000-000000000001",
      vehicle_id: vehicleId || "40000000-0000-0000-0000-000000000001",
      owner_id: ownerId || "30000000-0000-0000-0000-000000000001",
      reporter_id: "30000000-0000-0000-0000-000000000002",
      alert_type_id: "20000000-0000-0000-0000-000000000001",
      status: "pending",
      message: message || "سيارتك حاجزة سيارتي",
      created_at: new Date().toISOString(),
      acknowledged_at: null,
      resolved_at: null,
    };

    // Try Supabase insert
    try {
      const supabase = await createClient();
      await supabase.from("parking_alerts").insert({
        organization_id: newAlert.organization_id,
        vehicle_id: newAlert.vehicle_id,
        owner_id: newAlert.owner_id,
        reporter_id: newAlert.reporter_id,
        alert_type_id: newAlert.alert_type_id,
        status: newAlert.status,
        message: newAlert.message,
      });
    } catch {
      // Stored in runtime memory
    }

    runtimeAlerts.unshift(newAlert);

    return NextResponse.json({
      success: true,
      alert: newAlert,
      message: "Alert created successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, status } = body;

    const alertIndex = runtimeAlerts.findIndex((a) => a.id === alertId);
    if (alertIndex === -1) {
      return NextResponse.json({ success: false, error: "Alert not found" }, { status: 404 });
    }

    const currentAlert = runtimeAlerts[alertIndex];
    const now = new Date().toISOString();

    if (status === "acknowledged") {
      currentAlert.status = "acknowledged";
      currentAlert.acknowledged_at = now;
    } else if (status === "resolved") {
      currentAlert.status = "resolved";
      currentAlert.resolved_at = now;
      if (!currentAlert.acknowledged_at) {
        currentAlert.acknowledged_at = now;
      }
    } else if (status === "cancelled") {
      currentAlert.status = "cancelled";
    }

    // Try Supabase update
    try {
      const supabase = await createClient();
      await supabase
        .from("parking_alerts")
        .update({
          status: currentAlert.status,
          acknowledged_at: currentAlert.acknowledged_at,
          resolved_at: currentAlert.resolved_at,
        })
        .eq("id", alertId);
    } catch {
      // Keep runtime alert updated
    }

    return NextResponse.json({
      success: true,
      alert: currentAlert,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
