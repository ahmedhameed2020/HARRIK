import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/observability/error-sink";
import { scrubText, scrubExtra } from "@/lib/observability/scrub";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

/**
 * POST /api/observability/report
 *
 * Public endpoint that accepts client-side error reports (see
 * lib/observability/client.ts). Must be reachable before sign-in, so it is
 * exempted from the auth middleware — abuse is contained by a durable per-IP
 * throttle plus strict payload validation and scrubbing.
 */
const REPORT_WINDOW_SECONDS = 60;
const REPORT_MAX_PER_WINDOW = 20;
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);

    if (ip !== "unknown") {
      try {
        const supabase = await createClient();
        const limited = await enforceRateLimit(
          supabase,
          "observability:ip",
          ip,
          REPORT_WINDOW_SECONDS,
          REPORT_MAX_PER_WINDOW
        );
        if (!limited.allowed) {
          return NextResponse.json({ success: false, error: "Too many reports" }, { status: 429 });
        }
      } catch {
        // Fail-open: never block error reporting due to throttling problems.
      }
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: "Payload too large" }, { status: 413 });
    }

    let body: any = {};
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    await reportError(new Error(scrubText(body?.message) || "Client error"), {
      scope: `client/${scrubText(body?.scope) || "unknown"}`,
      route: scrubText(body?.route),
      digest: body?.digest ? scrubText(body.digest) : undefined,
      extra: {
        ...scrubExtra(body?.extra),
        userAgent: body?.userAgent ? scrubText(body.userAgent) : undefined,
        stack: body?.stack ? scrubText(body.stack) : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    // Even the reporter must not 500 loudly.
    return NextResponse.json({ success: false, error: err?.message || "error" }, { status: 200 });
  }
}
