import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/channels";
import { buildOrganizationReport, renderReportHtml } from "@/lib/reports/summary";

/**
 * POST /api/reports/email — scheduled operations report (§5.3).
 *
 * Modes:
 *  1. Scheduler: header `x-harrik-cron-secret: <CRON_SECRET>`.
 *     Body: { organizationId?, to?: string[], days? }.
 *     When `organizationId` is omitted the report covers up to 20 organizations
 *     and requires `to` (or REPORT_EMAIL_TO) as the recipient.
 *  2. Authenticated admin: sends the report for their own organization to their
 *     own e-mail address.
 *
 * Example cron (Cloudflare Worker scheduled handler / any scheduler):
 *   curl -X POST https://<host>/api/reports/email \
 *     -H "x-harrik-cron-secret: $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"to":["admin@school.edu.qa"],"days":7}'
 */
export async function POST(request: NextRequest) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لم يتم تهيئة مزوّد البريد (EMAIL_PROVIDER + مفتاح المزوّد). التقرير البريدية غير مفعّلة.",
        },
        { status: 503 }
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    const provided = request.headers.get("x-harrik-cron-secret");
    const viaCron = Boolean(cronSecret && provided && provided === cronSecret);

    const body = await request.json().catch(() => ({}));
    const days = Number.isFinite(Number(body?.days)) ? Number(body.days) : 7;

    // ---------------------------- Scheduler mode ----------------------------
    if (viaCron) {
      const recipients: string[] = Array.isArray(body?.to) && body.to.length > 0
        ? body.to.map((r: unknown) => String(r)).filter((r: string) => r.includes("@"))
        : String(process.env.REPORT_EMAIL_TO || "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.includes("@"));

      if (recipients.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "لا يوجد مستلمون. مرّر to[] في الطلب أو اضبط REPORT_EMAIL_TO.",
          },
          { status: 400 }
        );
      }

      const admin = createAdminClient() as any;

      let organizationIds: string[] = [];
      if (body?.organizationId) {
        organizationIds = [String(body.organizationId)];
      } else {
        const { data: orgs } = await admin
          .from("organizations")
          .select("id")
          .eq("status", "active")
          .limit(20);
        organizationIds = (orgs || []).map((o: any) => o.id);
      }

      let sent = 0;
      const results: Array<{ organizationId: string; ok: boolean }> = [];

      for (const orgId of organizationIds) {
        const report = await buildOrganizationReport(admin, orgId, { days });
        if (!report) {
          results.push({ organizationId: orgId, ok: false });
          continue;
        }

        const subject = `حَرِّك — التقرير التشغيلي (${report.periodDays} أيام) | ${report.organizationName}`;
        const html = renderReportHtml(report);

        // Send individually so recipients are never exposed to each other.
        let orgSent = false;
        for (const recipient of recipients) {
          const result = await sendEmail(recipient, subject, html);
          if (result.sent) {
            orgSent = true;
            sent++;
          }
        }

        results.push({ organizationId: orgId, ok: orgSent });
      }

      return NextResponse.json({
        success: true,
        scope: "scheduler",
        organizations: organizationIds.length,
        sent,
        results,
      });
    }

    // ------------------------- Authenticated admin mode ---------------------
    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    if (!["admin", "super_admin"].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const recipient = session.user?.email;
    if (!recipient) {
      return NextResponse.json(
        { success: false, error: "لا يوجد بريد إلكتروني مرتبط بحسابك" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const report = await buildOrganizationReport(supabase, session.organizationId, { days });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "تعذّر إنشاء التقرير" },
        { status: 500 }
      );
    }

    const result = await sendEmail(
      recipient,
      `حَرِّك — التقرير التشغيلي (${report.periodDays} أيام) | ${report.organizationName}`,
      renderReportHtml(report)
    );

    if (!result.sent) {
      return NextResponse.json(
        { success: false, error: "تعذّر إرسال البريد", detail: result.detail },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, scope: "organization", sentTo: recipient, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
