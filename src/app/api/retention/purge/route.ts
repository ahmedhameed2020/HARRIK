import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { purgeExpiredEventLogs } from "@/lib/retention/purge";

/**
 * POST /api/retention/purge — applies `system_settings.retention_days`.
 *
 * Two invocation modes, matching the other scheduled routes:
 *
 *  1. Scheduler / cron — header `x-harrik-cron-secret: <CRON_SECRET>`.
 *     Purges every organization using its own retention window (service-role
 *     client). Wired to a daily Cron Trigger in worker/cron-jobs.mjs.
 *  2. Authenticated admin — purges their own organization only, so a tenant can
 *     apply a shortened window immediately instead of waiting for the night.
 *
 * Only the event-log tables are expired; see lib/retention/purge.ts for what is
 * deliberately kept.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const provided = request.headers.get("x-harrik-cron-secret");
    const viaCron = Boolean(cronSecret && provided && provided === cronSecret);

    if (viaCron) {
      const admin = createAdminClient();
      const result = await purgeExpiredEventLogs(admin as any);
      return NextResponse.json({ success: true, scope: "all", ...result });
    }

    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    if (!["admin", "super_admin"].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin role required" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const result = await purgeExpiredEventLogs(supabase as any, {
      organizationId: session.organizationId,
    });

    // The purge is itself an auditable administrative action.
    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "PURGE_EXPIRED_EVENT_LOGS",
      entity_type: "system_settings",
      entity_id: session.organizationId,
      change_summary: {
        event: "retention_purge",
        deleted: result.organizations[0]?.deleted ?? {},
        cutoff: result.organizations[0]?.cutoff ?? null,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, scope: "organization", ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
