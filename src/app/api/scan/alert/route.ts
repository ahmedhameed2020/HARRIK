import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { dispatchAlertNotifications } from "@/lib/notifications/alert-dispatch";
import { MOCK_TOKEN_VEHICLES, FIXTURES_ENABLED } from "@/lib/test-fixtures";
import { clientIp, enforceRateLimit, verifyTurnstile } from "@/lib/security/rate-limit";

const SUPPRESSION_WINDOW_SECONDS = 5 * 60; // 5 minutes

// Public endpoint: cap how many *different* permits one IP may alert in a window.
const IP_WINDOW_SECONDS = 5 * 60;
const IP_MAX_ALERTS = 10;

// Standard UUID format validator
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Lightweight in-process throttle. Used as a fast path and as a fallback when
 * the durable database throttle (claim_alert_slot) is unavailable. The database
 * function remains the authoritative, cross-instance guard.
 */
const RECENT_ALERTS = new Map<string, number>();

interface ResolvedTarget {
  vehicle_id: string | null;
  visitor_pass_id: string | null;
  organization_id: string;
  owner_id: string | null;
}

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

    const isFixtureToken = FIXTURES_ENABLED && Boolean(MOCK_TOKEN_VEHICLES[permitToken]);
    const ip = clientIp(request);

    // Abuse protection (skipped for deterministic fixtures / unknown IP):
    //  - optional bot challenge (enforced only when Turnstile is configured)
    //  - durable per-IP throttle against spraying many different permits
    if (!isFixtureToken && ip !== "unknown") {
      const turnstile = await verifyTurnstile(body?.turnstileToken, ip);
      if (!turnstile.ok) {
        return NextResponse.json(
          { success: false, error: "تعذّر التحقق من كونك مستخدماً حقيقياً. يرجى إعادة المحاولة." },
          { status: 403 }
        );
      }

      try {
        const supabaseForLimit = await createClient();
        const limited = await enforceRateLimit(
          supabaseForLimit,
          "scan:alert:ip",
          ip,
          IP_WINDOW_SECONDS,
          IP_MAX_ALERTS
        );
        if (!limited.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: "تم إرسال عدد كبير من التنبيهات من هذا الجهاز. يرجى المحاولة بعد قليل.",
              retryAfter: IP_WINDOW_SECONDS,
            },
            { status: 429 }
          );
        }
      } catch {
        // Fail-open: never block an emergency alert because throttling failed.
      }
    }

    // Lazily created — never touched on the fixture path (avoids request-scope issues).
    let supabase: SupabaseClient | null = null;
    const getSupabase = async (): Promise<SupabaseClient | null> => {
      if (supabase) return supabase;
      try {
        supabase = await createClient();
      } catch {
        supabase = null;
      }
      return supabase;
    };

    const now = Date.now();

    // 0. Fast in-process throttle
    const lastAlert = RECENT_ALERTS.get(permitToken);
    if (lastAlert && now - lastAlert < SUPPRESSION_WINDOW_SECONDS * 1000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "تم إرسال تنبيه لهذه السيارة مسبقاً. يرجى الانتظار بضع دقائق قبل إرسال تنبيه آخر منعاً للإزعاج.",
          retryAfter: Math.ceil((SUPPRESSION_WINDOW_SECONDS * 1000 - (now - lastAlert)) / 1000),
        },
        { status: 429 }
      );
    }

    // 1. Resolve the permit target (fixtures only outside production)
    let target: ResolvedTarget | null = null;
    let errorCode: number | null = null;
    let errorMessage: string | null = null;

    if (FIXTURES_ENABLED && MOCK_TOKEN_VEHICLES[permitToken]) {
      const mock = MOCK_TOKEN_VEHICLES[permitToken];
      if (!mock.is_active) {
        errorCode = 403;
        errorMessage = "تصريح الموقف ملغى ولا يمكن إرسال تنبيهات له";
      } else if (mock.is_expired) {
        errorCode = 410;
        errorMessage = "انتهت صلاحية تصريح موقف الزائر";
      } else {
        target = {
          vehicle_id: mock.vehicle_id,
          visitor_pass_id: null,
          organization_id: mock.organization_id,
          owner_id: mock.owner_id,
        };
      }
    } else {
      const db = await getSupabase();
      if (db) {
        const { data: veh } = await db
          .from("vehicles")
          .select(`id, organization_id, is_active, permit_status, staff_vehicles (staff_id)`)
          .eq("permit_token", permitToken)
          .maybeSingle();

        if (veh) {
          if (!veh.is_active || (veh as any).permit_status === "revoked") {
            errorCode = 403;
            errorMessage = "تصريح الموقف ملغى من قبل الإدارة";
          } else {
            target = {
              vehicle_id: veh.id,
              visitor_pass_id: null,
              organization_id: veh.organization_id,
              owner_id: (veh as any).staff_vehicles?.[0]?.staff_id || null,
            };
          }
        } else {
          const { data: vis } = await db
            .from("visitor_passes")
            .select("id, organization_id, status, valid_until, host_profile_id")
            .eq("permit_token", permitToken)
            .maybeSingle();

          if (vis) {
            if (vis.status === "revoked") {
              errorCode = 403;
              errorMessage = "تصريح الزائر ملغى";
            } else if (vis.status === "expired" || new Date(vis.valid_until).getTime() <= now) {
              errorCode = 410;
              errorMessage = "انتهت صلاحية تصريح موقف الزائر";
            } else {
              target = {
                vehicle_id: null,
                visitor_pass_id: vis.id,
                organization_id: vis.organization_id,
                owner_id: vis.host_profile_id || null,
              };
            }
          }
        }
      }
    }

    if (errorCode) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: errorCode });
    }

    if (!target) {
      return NextResponse.json(
        { success: false, error: "تصريح الموقف غير مسجل في النظام" },
        { status: 404 }
      );
    }

    // 2. Durable, server-authoritative throttle (cross-instance)
    const db = await getSupabase();
    if (db) {
      try {
        const { data: allowed, error: throttleError } = await db.rpc("claim_alert_slot", {
          p_token: permitToken,
          p_org_id: target.organization_id,
          p_window_seconds: SUPPRESSION_WINDOW_SECONDS,
        });

        if (!throttleError && allowed === false) {
          RECENT_ALERTS.set(permitToken, now);
          return NextResponse.json(
            {
              success: false,
              error:
                "تم إرسال تنبيه لهذه السيارة مسبقاً. يرجى الانتظار بضع دقائق قبل إرسال تنبيه آخر منعاً للإزعاج.",
              retryAfter: SUPPRESSION_WINDOW_SECONDS,
            },
            { status: 429 }
          );
        }
      } catch {
        // Fail-open: throttle RPC unavailable should not block an emergency alert.
      }
    }

    // Record in-process timestamp (authoritative fallback)
    RECENT_ALERTS.set(permitToken, now);
    for (const [t, ts] of RECENT_ALERTS.entries()) {
      if (now - ts > SUPPRESSION_WINDOW_SECONDS * 1000) RECENT_ALERTS.delete(t);
    }

    // 3. Insert the alert with the correct target column
    let insertedId: string | null = null;
    if (db) {
      try {
        const { data: typeRow } = await db
          .from("parking_alert_types")
          .select("id")
          .eq("organization_id", target.organization_id)
          .eq("code", alertType)
          .maybeSingle();

        const alertTypeId = typeRow?.id || "20000000-0000-0000-0000-000000000001";

        const { data: inserted } = await db
          .from("parking_alerts")
          .insert({
            organization_id: target.organization_id,
            vehicle_id: target.vehicle_id,
            visitor_pass_id: target.visitor_pass_id,
            owner_id: target.owner_id || "30000000-0000-0000-0000-000000000001",
            alert_type_id: alertTypeId,
            status: "pending",
            message: message || "سيارتك حاجزة سيارتي يرجى التكرم بتحريكها (عبر مسح الباركود)",
          })
          .select("id")
          .single();

        insertedId = inserted?.id || null;
      } catch {
        // Catch db errors gracefully
      }

      // 4. Dispatch push to the owner + escalate when unreachable
      await dispatchAlertNotifications(db, {
        organizationId: target.organization_id,
        ownerId: target.owner_id,
        alertId: insertedId,
        url: "/inbox",
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال التنبيه فورياً للسائق بنجاح",
    });
  } catch (err: any) {
    console.error("scan/alert unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء إرسال التنبيه" },
      { status: 500 }
    );
  }
}
