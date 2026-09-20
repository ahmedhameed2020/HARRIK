/**
 * حَرِّك | HARRIK — Organization report summary (§5.3).
 *
 * Builds the aggregate payload used by the scheduled e-mail report. The summary
 * contains counts and durations only — no owner names, phones or plates are
 * included, so it is safe to deliver over e-mail.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface OrganizationReportSummary {
  organizationId: string;
  organizationName: string;
  periodDays: number;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  alertsCreated: number;
  alertsResolved: number;
  alertsPending: number;
  resolutionRatePct: number;
  averageResolutionMinutes: number | null;
  unknownReportsOpen: number;
  registeredVehicles: number;
  registeredMembers: number;
  busiestHour: number | null;
}

interface BuildOptions {
  days?: number;
  locale?: "ar" | "en";
}

export async function buildOrganizationReport(
  supabase: SupabaseClient,
  organizationId: string,
  options: BuildOptions = {}
): Promise<OrganizationReportSummary | null> {
  const days = Math.min(Math.max(options.days ?? 7, 1), 90);
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const [orgRes, alertsRes, unknownRes, vehiclesRes, membersRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("name_ar, name_en")
        .eq("id", organizationId)
        .maybeSingle(),
      supabase
        .from("parking_alerts")
        .select("status, created_at, resolved_at")
        .eq("organization_id", organizationId)
        .gte("created_at", windowStart.toISOString())
        .limit(5000),
      supabase
        .from("unknown_vehicle_reports")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "open"),
      supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true),
    ]);

    if (!orgRes.data) return null;

    const alerts = (alertsRes.data || []) as any[];
    const resolved = alerts.filter((a) => a.status === "resolved");
    const pending = alerts.filter((a) => a.status === "pending" || a.status === "acknowledged");

    let totalMinutes = 0;
    let withDuration = 0;
    const hourCounts: Record<number, number> = {};

    for (const a of alerts) {
      const created = new Date(a.created_at);
      const h = created.getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;

      if (a.resolved_at && a.status === "resolved") {
        const mins = (new Date(a.resolved_at).getTime() - created.getTime()) / 60000;
        if (mins >= 0 && mins < 24 * 60) {
          totalMinutes += mins;
          withDuration++;
        }
      }
    }

    const busiestHour =
      Object.keys(hourCounts).length > 0
        ? Number(
            Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0]
          )
        : null;

    return {
      organizationId,
      organizationName: orgRes.data.name_ar || orgRes.data.name_en || "HARRIK",
      periodDays: days,
      generatedAt: windowEnd.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      alertsCreated: alerts.length,
      alertsResolved: resolved.length,
      alertsPending: pending.length,
      resolutionRatePct:
        alerts.length > 0 ? Math.round((resolved.length / alerts.length) * 100) : 100,
      averageResolutionMinutes:
        withDuration > 0 ? Math.round(totalMinutes / withDuration) : null,
      unknownReportsOpen: unknownRes.count ?? 0,
      registeredVehicles: vehiclesRes.count ?? 0,
      registeredMembers: membersRes.count ?? 0,
      busiestHour,
    };
  } catch {
    return null;
  }
}

/** Renders the summary as a compact bilingual HTML e-mail body. */
export function renderReportHtml(report: OrganizationReportSummary): string {
  const hourLabel =
    report.busiestHour === null
      ? "—"
      : `${String(report.busiestHour).padStart(2, "0")}:00`;

  const rows: Array<[string, string]> = [
    ["فترة التقرير / Period", `${report.periodDays} days`],
    ["إجمالي البلاغات / Incidents", String(report.alertsCreated)],
    ["تم حلها / Resolved", String(report.alertsResolved)],
    ["قيد المتابعة / Pending", String(report.alertsPending)],
    ["نسبة الحل / Resolution rate", `${report.resolutionRatePct}%`],
    [
      "متوسط زمن الحل / Avg resolution",
      report.averageResolutionMinutes === null
        ? "—"
        : `${report.averageResolutionMinutes} min`,
    ],
    ["ساعة الذروة / Busiest hour", hourLabel],
    ["بلاغات سيارات مجهولة مفتوحة / Open unknown", String(report.unknownReportsOpen)],
    ["المركبات المسجلة / Registered vehicles", String(report.registeredVehicles)],
    ["الكادر النشط / Active members", String(report.registeredMembers)],
  ];

  return `<!doctype html>
<html dir="rtl" lang="ar">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:'IBM Plex Sans Arabic',system-ui,Segoe UI,Roboto,sans-serif;color:#0f172a">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:20px;padding:28px;border:1px solid #e2e8f0">
      <div style="font-size:11px;font-weight:700;color:#64748b">حَرِّك | HARRIK — Smart Parking</div>
      <h1 style="font-size:20px;font-weight:900;margin:6px 0 2px">${escapeHtml(report.organizationName)}</h1>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px">
        التقرير التشغيلي الدوري / Periodic operations report — ${new Date(report.generatedAt).toLocaleString("ar-QA")}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:9px 0;border-bottom:1px solid #f1f5f9;color:#475569">${escapeHtml(
                k
              )}</td><td style="padding:9px 0;border-bottom:1px solid #f1f5f9;text-align:left;font-weight:800">${escapeHtml(
                v
              )}</td></tr>`
          )
          .join("")}
      </table>
      <p style="font-size:11px;color:#94a3b8;margin-top:20px">
        تقرير آلي — لا يُظهر أسماء المالكين أو أرقام الجوالات أو أرقام اللوحات.
      </p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
