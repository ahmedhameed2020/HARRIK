import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { escalateStaleAlerts } from "@/lib/notifications/escalate-stale";

/**
 * POST /api/alerts/escalate
 *
 * Escalates parking alerts that have been pending past the threshold without
 * acknowledgement. Two invocation modes:
 *
 *  1. Scheduler / cron — send header `x-harrik-cron-secret: <CRON_SECRET>`.
 *     Escalates across all organizations (service-role client, bounded batch).
 *  2. Authenticated admin/security member — escalates their own organization.
 *
 * Escalation also happens lazily in GET /api/alerts and GET /api/dashboard, so
 * this endpoint is only needed for faster/timed escalation.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const provided = request.headers.get("x-harrik-cron-secret");
    const viaCron = Boolean(cronSecret && provided && provided === cronSecret);

    if (viaCron) {
      const admin = createAdminClient();
      const result = await escalateStaleAlerts(admin as any, { limit: 50 });
      return NextResponse.json({ success: true, scope: "all", ...result });
    }

    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    if (!["admin", "super_admin", "security"].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin or security role required" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const result = await escalateStaleAlerts(supabase, {
      organizationId: session.organizationId,
    });

    return NextResponse.json({ success: true, scope: "organization", ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
