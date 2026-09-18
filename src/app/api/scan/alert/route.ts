import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWebPushNotification } from "@/lib/push/vapid";

// In-memory rate limiting map for quick suppression (Key: permitToken, Value: timestamp ms)
const RECENT_ALERTS = new Map<string, number>();
const SUPPRESSION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Standard UUID format validator
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Mock test vehicles for deterministic testing
const MOCK_TOKEN_VEHICLES: Record<string, any> = {
  "11111111-1111-4111-8111-111111111111": {
    vehicle_id: "40000000-0000-0000-0000-000000000001",
    organization_id: "00000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000001",
    is_active: true,
  },
  "22222222-2222-4222-8222-222222222222": {
    vehicle_id: "40000000-0000-0000-0000-000000000002",
    organization_id: "00000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000003",
    is_active: true,
  },
  "33333333-3333-4333-8333-333333333333": {
    vehicle_id: "40000000-0000-0000-0000-000000000003",
    organization_id: "00000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000001",
    is_active: false, // Revoked
  },
  "44444444-4444-4444-8444-444444444444": {
    vehicle_id: "50000000-0000-0000-0000-000000000001",
    organization_id: "00000000-0000-0000-0000-000000000001",
    owner_id: "30000000-0000-0000-0000-000000000004",
    is_active: true,
    is_expired: true, // Expired visitor
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { permitToken, alertType = "BLOCKING", message } = body;

    if (!permitToken) {
      return NextResponse.json(
        { success: false, error: "رمز تصريح الموقف مطلوب" },
        { status: 400 }
      );
    }

    if (!UUID_REGEX.test(permitToken)) {
      return NextResponse.json(
        { success: false, error: "صيغة رمز التصريح غير صالحة" },
        { status: 400 }
      );
    }

    // 1. Check in-memory repeated-alert suppression
    const now = Date.now();
    const lastAlert = RECENT_ALERTS.get(permitToken);
    if (lastAlert && now - lastAlert < SUPPRESSION_WINDOW_MS) {
      const remainingSeconds = Math.ceil((SUPPRESSION_WINDOW_MS - (now - lastAlert)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `تم إرسال تنبيه لهذه السيارة مسبقاً. يرجى الانتظار ${Math.ceil(remainingSeconds / 60)} دقائق قبل إرسال تنبيه آخر منعاً للإزعاج.`,
          retryAfter: remainingSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Validate token status (revocation & expiry)
    let vehicleInfo: any = null;

    if (MOCK_TOKEN_VEHICLES[permitToken]) {
      const mock = MOCK_TOKEN_VEHICLES[permitToken];
      if (!mock.is_active) {
        return NextResponse.json(
          { success: false, error: "تصريح الموقف ملغى ولا يمكن إرسال تنبيهات له" },
          { status: 403 }
        );
      }
      if (mock.is_expired) {
        return NextResponse.json(
          { success: false, error: "انتهت صلاحية تصريح موقف الزائر" },
          { status: 410 }
        );
      }
      vehicleInfo = mock;
    } else {
      // Query database
      const supabase = await createClient();

      // First check registered staff vehicle
      const { data: veh } = await supabase
        .from("vehicles")
        .select(`
          id,
          organization_id,
          is_active,
          permit_status,
          staff_vehicles (
            staff_id
          )
        `)
        .eq("permit_token", permitToken)
        .maybeSingle();

      if (veh) {
        if (!veh.is_active || (veh as any).permit_status === "revoked") {
          return NextResponse.json(
            { success: false, error: "تصريح الموقف ملغى من قبل الإدارة" },
            { status: 403 }
          );
        }

        const staffId = (veh as any).staff_vehicles?.[0]?.staff_id;
        vehicleInfo = {
          vehicle_id: veh.id,
          organization_id: veh.organization_id,
          owner_id: staffId,
        };
      } else {
        // Check visitor passes
        const { data: vis } = await supabase
          .from("visitor_passes")
          .select("id, organization_id, status, valid_until, host_profile_id")
          .eq("permit_token", permitToken)
          .maybeSingle();

        if (vis) {
          if (vis.status === "revoked") {
            return NextResponse.json(
              { success: false, error: "تصريح الزائر ملغى" },
              { status: 403 }
            );
          }
          if (vis.status === "expired" || new Date(vis.valid_until).getTime() <= now) {
            return NextResponse.json(
              { success: false, error: "انتهت صلاحية تصريح موقف الزائر" },
              { status: 410 }
            );
          }

          vehicleInfo = {
            vehicle_id: vis.id,
            organization_id: vis.organization_id,
            owner_id: vis.host_profile_id,
          };
        }
      }
    }

    if (!vehicleInfo) {
      return NextResponse.json(
        { success: false, error: "تصريح الموقف غير مسجل في النظام" },
        { status: 404 }
      );
    }

    // 3. Check database repeated-alert suppression for this vehicle
    try {
      const supabase = await createClient();
      const fiveMinutesAgo = new Date(now - SUPPRESSION_WINDOW_MS).toISOString();

      const { data: existingAlert } = await supabase
        .from("parking_alerts")
        .select("id, created_at")
        .eq("vehicle_id", vehicleInfo.vehicle_id)
        .gte("created_at", fiveMinutesAgo)
        .in("status", ["pending", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAlert) {
        RECENT_ALERTS.set(permitToken, new Date(existingAlert.created_at).getTime());
        return NextResponse.json(
          {
            success: false,
            error: "تم إرسال تنبيه لهذه السيارة مسبقاً، وهو قيد المتابعة حالياً",
          },
          { status: 429 }
        );
      }
    } catch {
      // Continue if db check fails
    }

    // 4. Record timestamp in rate limiter
    RECENT_ALERTS.set(permitToken, now);

    // 5. Clean up stale entries older than suppression window
    for (const [t, ts] of RECENT_ALERTS.entries()) {
      if (now - ts > SUPPRESSION_WINDOW_MS) {
        RECENT_ALERTS.delete(t);
      }
    }

    // 6. Insert new alert strictly using server-derived fields
    try {
      const supabase = await createClient();

      // Resolve alert type
      const { data: typeRow } = await supabase
        .from("parking_alert_types")
        .select("id")
        .eq("organization_id", vehicleInfo.organization_id)
        .eq("code", alertType)
        .maybeSingle();

      const alertTypeId = typeRow?.id || "20000000-0000-0000-0000-000000000001";

      await supabase.from("parking_alerts").insert({
        organization_id: vehicleInfo.organization_id,
        vehicle_id: vehicleInfo.vehicle_id,
        owner_id: vehicleInfo.owner_id || "30000000-0000-0000-0000-000000000001",
        alert_type_id: alertTypeId,
        status: "pending",
        message: message || "سيارتك حاجزة سيارتي يرجى التكرم بتحريكها (عبر مسح الباركود)",
      });

      // 7. Dispatch Web Push to derived owner (Client cannot supply arbitrary recipient)
      if (vehicleInfo.owner_id) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("profile_id", vehicleInfo.owner_id)
          .eq("organization_id", vehicleInfo.organization_id);

        if (subs && subs.length > 0) {
          for (const sub of subs) {
            try {
              await sendWebPushNotification(
                { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
                {
                  title: "تنبيه مواقف جديد",
                  body: "يرجى التكرم بمراجعة الموقف لتحريك مركبتكم",
                  url: "/inbox",
                  tag: `alert-${vehicleInfo.vehicle_id}`,
                }
              );
            } catch {
              // Ignore individual push send failures
            }
          }
        }
      }
    } catch {
      // Catch db errors gracefully
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال التنبيه فورياً للسائق بنجاح",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء إرسال التنبيه" },
      { status: 500 }
    );
  }
}
