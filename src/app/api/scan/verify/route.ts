import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { KNOWN_PERMIT_TOKENS, FIXTURES_ENABLED } from "@/lib/test-fixtures";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

// Standard UUID format validator
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Permit verification is public: throttle enumeration attempts per IP.
const VERIFY_WINDOW_SECONDS = 60;
const VERIFY_MAX_PER_WINDOW = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json(
        { success: false, valid: false, error: "رمز تصريح الموقف مطلوب" },
        { status: 400 }
      );
    }

    if (!UUID_REGEX.test(token)) {
      return NextResponse.json(
        { success: false, valid: false, error: "صيغة رمز التصريح غير صالحة" },
        { status: 400 }
      );
    }

    // Abuse protection: durable per-IP throttle (skipped when IP is unknown,
    // e.g. in unit tests, so that behaviour stays deterministic).
    const ip = clientIp(request);
    if (ip !== "unknown" && !(FIXTURES_ENABLED && KNOWN_PERMIT_TOKENS[token])) {
      try {
        const supabaseForLimit = await createClient();
        const limited = await enforceRateLimit(
          supabaseForLimit,
          "scan:verify:ip",
          ip,
          VERIFY_WINDOW_SECONDS,
          VERIFY_MAX_PER_WINDOW
        );
        if (!limited.allowed) {
          return NextResponse.json(
            {
              success: false,
              valid: false,
              error: "عدد كبير من المحاولات. يرجى المحاولة بعد قليل.",
              retryAfter: VERIFY_WINDOW_SECONDS,
            },
            { status: 429 }
          );
        }
      } catch {
        // Fail-open: never block permit verification because throttling failed.
      }
    }

    // Check mock tokens first for test determinism (non-production only)
    if (FIXTURES_ENABLED && KNOWN_PERMIT_TOKENS[token]) {
      const known = KNOWN_PERMIT_TOKENS[token];
      if (!known.is_valid) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            status_reason: known.status_reason,
            error: known.error || "تصريح الموقف غير صالح",
          },
          { status: known.status_reason === "expired" ? 410 : 403 }
        );
      }

      return NextResponse.json({
        success: true,
        valid: true,
        vehicle: {
          make: known.make,
          model: known.model,
          color: known.color,
          venueName: known.venue_name,
          permitKind: known.entity_type || "staff",
        },
      });
    }

    // Verify against Supabase RPC
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("verify_permit_token", {
        p_token: token,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        const row = data[0];
        if (!row.is_valid) {
          const statusReason = row.status_reason || "invalid";
          const errorMsg =
            statusReason === "revoked"
              ? "تصريح الموقف ملغى من قبل إدارة المنشأة"
              : statusReason === "expired"
              ? "انتهت صلاحية تصريح موقف الزائر"
              : "تصريح الموقف غير مسجل أو غير صالح";

          return NextResponse.json(
            { success: false, valid: false, status_reason: statusReason, error: errorMsg },
            { status: statusReason === "expired" ? 410 : 403 }
          );
        }

        // Return strictly zero-internal-identifier minimal context
        return NextResponse.json({
          success: true,
          valid: true,
          vehicle: {
            make: row.make,
            model: row.model,
            color: row.color,
            venueName: row.venue_name,
            permitKind: row.permit_kind || "staff",
          },
        });
      }
    } catch {
      // Fallback to table queries if RPC is not yet deployed
      try {
        const supabase = await createClient();
        const { data: veh } = await supabase
          .from("vehicles")
          .select("make, model, color, is_active, permit_status, organization:organizations(name_ar)")
          .eq("permit_token", token)
          .maybeSingle();

        if (veh) {
          if (!veh.is_active || (veh as any).permit_status === "revoked") {
            return NextResponse.json(
              { success: false, valid: false, status_reason: "revoked", error: "تصريح الموقف ملغى" },
              { status: 403 }
            );
          }

          return NextResponse.json({
            success: true,
            valid: true,
            vehicle: {
              make: veh.make,
              model: veh.model,
              color: veh.color,
              venueName: (veh as any).organization?.name_ar || "المنشأة",
              permitKind: "staff",
            },
          });
        }
      } catch {
        // Fallback continues
      }
    }

    return NextResponse.json(
      { success: false, valid: false, status_reason: "not_found", error: "تصريح الموقف غير مسجل في النظام" },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, valid: false, error: err.message || "حدث خطأ أثناء فحص التصريح" },
      { status: 500 }
    );
  }
}
