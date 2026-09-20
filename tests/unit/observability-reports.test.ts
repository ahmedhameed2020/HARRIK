import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { scrubText, scrubExtra } from "../../src/lib/observability/scrub";
import {
  normalizeError,
  reportError,
  isErrorSinkConfigured,
} from "../../src/lib/observability/error-sink";
import { renderReportHtml, type OrganizationReportSummary } from "../../src/lib/reports/summary";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const exists = (rel: string) => fs.existsSync(path.join(process.cwd(), rel));

describe("HARRIK — Observability, skeletons, alert types & scheduled reports", () => {
  // ------------------------------------------------------------ PII scrubbing
  it("1. scrubs e-mails, phones, digit runs and secrets", () => {
    expect(scrubText("contact ali@school.edu.qa now")).toBe("contact [email] now");
    expect(scrubText("call +974 5512 3456")).not.toContain("5512");
    // A 6-digit plate must be masked (first two digits kept for correlation).
    const plate = scrubText("plate 482731 blocked");
    expect(plate).toContain("48****");
    expect(plate).not.toContain("482731");
    expect(scrubText("bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")).toContain("[redacted]");
    expect(scrubText(null)).toBe("");
    expect(scrubText("x".repeat(5000)).length).toBeLessThanOrEqual(2000);
  });

  it("2. scrubs nested context values", () => {
    const out = scrubExtra({ note: "user ali@x.com", count: 3 })!;
    expect(out.note).toBe("user [email]");
    expect(out.count).toBe(3);
    expect(scrubExtra(undefined)).toBeUndefined();
  });

  it("3. normalizes errors into a scrubbed event", () => {
    const event = normalizeError(new Error("failed for ali@x.com on plate 482731"), {
      scope: "api/test",
      route: "/api/test",
      method: "POST",
      organizationId: "00000000-0000-0000-0000-000000000001",
    });
    expect(event.level).toBe("error");
    expect(event.message).toContain("[email]");
    expect(event.message).not.toContain("482731");
    expect(event.organizationId).toBe("00000000-0000-0000-0000-000000000001");
    expect(event.timestamp).toBeTruthy();
  });

  it("4. reporting never throws and no-ops without a configured sink", async () => {
    const prevDsn = process.env.SENTRY_DSN;
    const prevHook = process.env.ERROR_WEBHOOK_URL;
    delete process.env.SENTRY_DSN;
    delete process.env.ERROR_WEBHOOK_URL;

    expect(isErrorSinkConfigured()).toBe(false);
    await expect(reportError(new Error("boom"), { scope: "test" })).resolves.toBe(false);
    // A malformed DSN must not throw either.
    process.env.SENTRY_DSN = "not-a-valid-dsn";
    await expect(reportError(new Error("boom"))).resolves.toBe(false);

    if (prevDsn !== undefined) process.env.SENTRY_DSN = prevDsn;
    if (prevHook !== undefined) process.env.ERROR_WEBHOOK_URL = prevHook;
  });

  // -------------------------------------------------------- wiring assertions
  it("5. server errors are captured centrally via instrumentation", () => {
    const inst = read("src/instrumentation.ts");
    expect(inst).toContain("export async function onRequestError");
    expect(inst).toContain("reportError");
    expect(inst).toContain("export async function register");
  });

  it("6. client errors are captured from boundaries and window handlers", () => {
    expect(exists("src/app/global-error.tsx")).toBe(true);
    expect(read("src/app/global-error.tsx")).toContain("reportClientError");
    expect(read("src/app/error.tsx")).toContain("reportClientError");

    const reporter = read("src/components/system/ErrorReporter.tsx");
    expect(reporter).toContain('"unhandledrejection"');
    expect(reporter).toContain('"error"');
    expect(read("src/components/layout/AppShell.tsx")).toContain("<ErrorReporter />");

    // Reporting endpoint must be reachable before sign-in.
    expect(read("src/middleware.ts")).toContain("/api/observability/");
    const route = read("src/app/api/observability/report/route.ts");
    expect(route).toContain("enforceRateLimit");
    expect(route).toContain("MAX_BODY_BYTES");
  });

  // ----------------------------------------------------------- loading skeletons
  it("7. every primary route ships a loading skeleton", () => {
    const routes = [
      "src/app/loading.tsx",
      "src/app/inbox/loading.tsx",
      "src/app/profile/loading.tsx",
      "src/app/admin/loading.tsx",
      "src/app/admin/staff/loading.tsx",
      "src/app/admin/vehicles/loading.tsx",
      "src/app/admin/visitors/loading.tsx",
      "src/app/admin/alerts/loading.tsx",
      "src/app/admin/unknown/loading.tsx",
      "src/app/admin/audit/loading.tsx",
      "src/app/admin/import/loading.tsx",
      "src/app/admin/reports/loading.tsx",
      "src/app/admin/settings/loading.tsx",
    ];
    for (const rel of routes) {
      expect(exists(rel), `${rel} missing`).toBe(true);
    }
    expect(exists("src/components/ui/Skeleton.tsx")).toBe(true);
    // The admin skeletons must reuse the shared primitives.
    expect(read("src/app/admin/staff/loading.tsx")).toContain("@/components/ui/Skeleton");
  });

  // --------------------------------------------------------------- alert types
  it("8. alert types can be managed and changes are audited", () => {
    const api = read("src/app/api/admin/alert-types/route.ts");
    expect(api).toContain("export async function GET");
    expect(api).toContain("export async function POST");
    expect(api).toContain("export async function PATCH");
    expect(api).toContain("export async function DELETE");
    // Admin-only mutations.
    expect(api).toContain('session.role !== "admin" && session.role !== "super_admin"');
    // Audit trail.
    expect(api).toContain("create_alert_type");
    expect(api).toContain("update_alert_type");
    expect(api).toContain("delete_alert_type");
    // Cannot delete a type still referenced by alerts (FK is RESTRICT).
    expect(api).toContain("referencedCount");

    // Settings UI consumes the endpoint.
    expect(read("src/app/admin/settings/page.tsx")).toContain("/api/admin/alert-types");
    // Create-alert dialog still loads tenant types dynamically.
    expect(read("src/features/alerts/CreateAlertDialog.tsx")).toContain("alertTypes");
  });

  // ---------------------------------------------------------- scheduled report
  it("9. scheduled e-mail report is protected by the cron secret", () => {
    const route = read("src/app/api/reports/email/route.ts");
    expect(route).toContain("CRON_SECRET");
    expect(route).toContain("x-harrik-cron-secret");
    expect(route).toContain("isEmailConfigured");
    expect(route).toContain("sendEmail");
    expect(route).toContain("buildOrganizationReport");

    // Cron mode must be reachable without a session.
    expect(read("src/middleware.ts")).toContain("/api/reports/email");

    // Admin UI can trigger it on demand.
    expect(read("src/app/admin/reports/page.tsx")).toContain("/api/reports/email");
  });

  it("10. the report body carries aggregates only and escapes HTML", () => {
    const summary: OrganizationReportSummary = {
      organizationId: "00000000-0000-0000-0000-000000000001",
      organizationName: "<script>alert(1)</script>",
      periodDays: 7,
      generatedAt: new Date().toISOString(),
      windowStart: new Date().toISOString(),
      windowEnd: new Date().toISOString(),
      alertsCreated: 12,
      alertsResolved: 10,
      alertsPending: 2,
      resolutionRatePct: 83,
      averageResolutionMinutes: 6,
      unknownReportsOpen: 1,
      registeredVehicles: 40,
      registeredMembers: 30,
      busiestHour: 13,
    };

    const html = renderReportHtml(summary);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("83%");
    expect(html).toContain("13:00");
    // No owner PII in the payload contract.
    expect(html).not.toMatch(/owner|phone|plate/i);
  });
});
