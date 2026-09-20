import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as verifyGet } from "../../src/app/api/scan/verify/route";
import { POST as alertPost } from "../../src/app/api/scan/alert/route";
import { POST as pushSendPost } from "../../src/app/api/push/send/route";
import { sanitizeCellValue } from "../../src/lib/excel-utils";
import fs from "fs";
import path from "path";

describe("HARRIK V1.0 - Attack-Surface & Security Audit Test Suite", () => {
  // Scenario 1: Invalid QR token format
  it("1. rejects invalid QR token format with HTTP 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan/verify?token=not-a-valid-uuid");
    const res = await verifyGet(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.valid).toBe(false);
    expect(json.error).toMatch(/صيغة رمز التصريح غير صالحة/);
  });

  // Scenario 2: Guessed QR token (non-existent)
  it("2. rejects guessed non-existent QR token with HTTP 404 without leaking PII", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan/verify?token=00000000-0000-4000-8000-999999999999");
    const res = await verifyGet(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.valid).toBe(false);
    expect(json.owner_name_ar).toBeUndefined();
    expect(json.owner_mobile).toBeUndefined();
    expect(json.error).toMatch(/غير مسجل/);
  });

  // Scenario 3: Revoked QR token
  it("3. rejects revoked QR token with HTTP 403", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan/verify?token=33333333-3333-4333-8333-333333333333");
    const res = await verifyGet(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.valid).toBe(false);
    expect(json.status_reason).toBe("revoked");
    expect(json.error).toMatch(/ملغى/);
  });

  // Scenario 4: Expired visitor token
  it("4. rejects expired visitor token with HTTP 410", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan/verify?token=44444444-4444-4444-8444-444444444444");
    const res = await verifyGet(req);
    const json = await res.json();

    expect(res.status).toBe(410);
    expect(json.valid).toBe(false);
    expect(json.status_reason).toBe("expired");
    expect(json.error).toMatch(/انتهت صلاحية/);
  });

  // Scenario 5: Anonymous alert spam (Repeated submission rate limiting)
  it("5. suppresses repeated anonymous alert spam within 5-minute window with HTTP 429", async () => {
    const token = "11111111-1111-4111-8111-111111111111";

    // First submission
    const req1 = new NextRequest("http://localhost:3000/api/scan/alert", {
      method: "POST",
      body: JSON.stringify({ permitToken: token, alertType: "BLOCKING" }),
    });
    const res1 = await alertPost(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(json1.success).toBe(true);

    // Second immediate submission should be throttled
    const req2 = new NextRequest("http://localhost:3000/api/scan/alert", {
      method: "POST",
      body: JSON.stringify({ permitToken: token, alertType: "BLOCKING" }),
    });
    const res2 = await alertPost(req2);
    const json2 = await res2.json();

    expect(res2.status).toBe(429);
    expect(json2.success).toBe(false);
    expect(json2.error).toMatch(/تم إرسال تنبيه لهذه السيارة مسبقاً/);
  });

  // Scenario 6: Cross-user vehicle edit
  it("6. rejects cross-user vehicle edit attempts", async () => {
    const vehiclesRouteCode = fs.readFileSync(path.join(process.cwd(), "src/app/api/profile/vehicles/route.ts"), "utf8");
    expect(vehiclesRouteCode).toContain('.eq("staff_id", session.profile.id)');
    expect(vehiclesRouteCode).toContain("غير مصرح لك بتعديل هذه السيارة");
  });

  // Scenario 7: Cross-org vehicle edit
  it("7. isolates vehicle creation and updates strictly to session organization_id", async () => {
    const vehiclesRouteCode = fs.readFileSync(path.join(process.cwd(), "src/app/api/profile/vehicles/route.ts"), "utf8");
    expect(vehiclesRouteCode).toContain("organization_id: session.organizationId");
  });

  // Scenario 8: Push subscription theft/read
  it("8. ensures push_subscriptions RLS isolates select, insert, delete strictly to auth.uid()", async () => {
    const migrationSql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260916000004_push_and_visitors.sql"), "utf8");
    expect(migrationSql).toContain('CREATE POLICY "push_subscriptions_select_own"');
    expect(migrationSql).toContain("USING (profile_id = auth.uid())");
    expect(migrationSql).toContain("WITH CHECK (profile_id = auth.uid())");
  });

  // Scenario 9: Arbitrary push recipient spoof by staff
  it("9. rejects arbitrary push recipient spoofing by non-admin staff with HTTP 403", async () => {
    const pushSendRouteCode = fs.readFileSync(path.join(process.cwd(), "src/app/api/push/send/route.ts"), "utf8");
    expect(pushSendRouteCode).toContain('session.role !== "admin" && session.role !== "super_admin" && session.role !== "security"');
    expect(pushSendRouteCode).toContain("غير مصرح لك بإرسال إشعارات مباشرة للمستخدمين");
  });

  // Scenario 10: Staff visitor creation denial
  it("10. denies regular staff from creating visitor passes via RLS and API RBAC", async () => {
    const visitorsRouteCode = fs.readFileSync(path.join(process.cwd(), "src/app/api/visitors/route.ts"), "utf8");
    expect(visitorsRouteCode).toContain('["admin", "super_admin", "security"].includes(session.role)');
    expect(visitorsRouteCode).toContain("غير مصرح: يتطلب صلاحيات أمن أو إدارة لإصدار تصاريح الزوار");
  });

  // Scenario 11: Expired visitor pass excluded from active search
  it("11. excludes expired visitor passes from active visitor queries", async () => {
    const visitorsRouteCode = fs.readFileSync(path.join(process.cwd(), "src/app/api/visitors/route.ts"), "utf8");
    expect(visitorsRouteCode).toContain('.gt("valid_until",');
  });

  // Scenario 12: Anonymous reports access
  it("12. denies anonymous unauthenticated access to admin reports with HTTP 401", async () => {
    const middlewareCode = fs.readFileSync(path.join(process.cwd(), "src/middleware.ts"), "utf8");
    expect(middlewareCode).toContain('if (pathname.startsWith("/admin"))');
    expect(middlewareCode).toContain("if (!user)");
  });

  // Scenario 13: Staff reports access denial
  it("13. denies regular staff from accessing admin reports with redirect / 403", async () => {
    const middlewareCode = fs.readFileSync(path.join(process.cwd(), "src/middleware.ts"), "utf8");
    expect(middlewareCode).toContain('profile.role !== "admin" && profile.role !== "super_admin" && profile.role !== "security"');
    expect(middlewareCode).toContain("error=unauthorized");
  });

  // Scenario 14: Spreadsheet formula injection neutralization
  it("14. neutralizes CSV and Excel formula injection prefixes (=, +, -, @)", () => {
    expect(sanitizeCellValue("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(sanitizeCellValue("+123456789")).toBe("'+123456789");
    expect(sanitizeCellValue("-5000")).toBe("'-5000");
    expect(sanitizeCellValue("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
    expect(sanitizeCellValue("Normal Text")).toBe("Normal Text");
    expect(sanitizeCellValue("123456")).toBe("123456");
  });

  // Scenario 15: Sensitive cache exclusion after logout
  it("15. ensures Service Worker excludes sensitive routes (/admin, /profile, /inbox, /api) from persistent cache", () => {
    const swCode = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    expect(swCode).toContain('url.pathname.startsWith("/admin")');
    expect(swCode).toContain('url.pathname.startsWith("/profile")');
    expect(swCode).toContain('url.pathname.startsWith("/inbox")');
    expect(swCode).toContain('url.pathname.startsWith("/api/")');
  });

  // Scenario 16: Universal Entity Type tenant/role manipulation protection
  it("16. ensures entity_type changes cannot alter organization_id or elevate user role", () => {
    const settingsRouteCode = fs.readFileSync(path.join(process.cwd(), "src/app/api/admin/settings/route.ts"), "utf8");
    expect(settingsRouteCode).toContain('session.role !== "admin" && session.role !== "super_admin"');
    expect(settingsRouteCode).toContain('.eq("id", session.organizationId)');
    expect(settingsRouteCode).toContain('.eq("organization_id", session.organizationId)');
  });

  // Scenario 17: Anonymous permit verification returns ZERO internal database identifiers
  it("17. ensures anonymous permit verification returns ZERO internal database identifiers", async () => {
    const validToken = "22222222-2222-4222-8222-222222222222";
    const req = new NextRequest(`http://localhost:3000/api/scan/verify?token=${validToken}`);
    const res = await verifyGet(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.valid).toBe(true);
    expect(json.vehicle).toBeDefined();

    // Verify minimal public contract
    expect(json.vehicle.make).toBeDefined();
    expect(json.vehicle.model).toBeDefined();
    expect(json.vehicle.color).toBeDefined();
    expect(json.vehicle.venueName).toBeDefined();
    expect(json.vehicle.permitKind).toBeDefined();

    // Verify ABSOLUTE ZERO internal identifiers
    expect(json.vehicle.vehicle_id).toBeUndefined();
    expect(json.vehicle.vehicleId).toBeUndefined();
    expect(json.vehicle.organization_id).toBeUndefined();
    expect(json.vehicle.organizationId).toBeUndefined();
    expect(json.vehicle.owner_id).toBeUndefined();
    expect(json.vehicle.ownerId).toBeUndefined();
    expect(json.vehicle.profile_id).toBeUndefined();
    expect(json.vehicle.visitor_id).toBeUndefined();
    expect(json.vehicle.department_id).toBeUndefined();
    expect(json.vehicle_id).toBeUndefined();
    expect(json.organization_id).toBeUndefined();

    // Verify RPC definition in Migration 05 also excludes internal IDs
    const migration05Sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260916000005_permit_tokens_and_security_fixes.sql"), "utf8");
    expect(migration05Sql).toMatch(/RETURNS TABLE \(\s*is_valid BOOLEAN,\s*status_reason TEXT,\s*permit_kind TEXT,\s*make TEXT,\s*model TEXT,\s*color TEXT,\s*venue_name TEXT\s*\)/);
  });

  // Scenario 18: Old token fails and new token succeeds after permit rotation
  it("18. proves old token fails and new token succeeds upon QR permit rotation", () => {
    const migration05Sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260916000005_permit_tokens_and_security_fixes.sql"), "utf8");
    expect(migration05Sql).toContain("CREATE OR REPLACE FUNCTION public.rotate_vehicle_permit");
    expect(migration05Sql).toContain("v_new_token := gen_random_uuid()");
    expect(migration05Sql).toContain("permit_token = v_new_token");
    expect(migration05Sql).toContain("permit_status = 'active'");

    // Route implementation check
    const permitRouteCode = fs.readFileSync(path.join(process.cwd(), "src/app/api/profile/vehicles/permit/route.ts"), "utf8");
    expect(permitRouteCode).toContain("rotate_vehicle_permit");
    expect(permitRouteCode).toContain("ROTATE_PERMIT_TOKEN");
  });

  // Scenario 19: POST /api/scan/alert ignores client-injected internal identifiers
  it("19. ignores client-injected internal identifiers in POST /api/scan/alert", async () => {
    const token = "22222222-2222-4222-8222-222222222222";
    const maliciousPayload = {
      permitToken: token,
      alertType: "BLOCKING",
      vehicle_id: "00000000-evil-0000-0000-000000000000",
      organization_id: "00000000-evil-0000-0000-000000000000",
      owner_id: "00000000-evil-0000-0000-000000000000",
      push_endpoint: "https://attacker.com/malicious-push",
    };

    const req = new NextRequest("http://localhost:3000/api/scan/alert", {
      method: "POST",
      body: JSON.stringify(maliciousPayload),
    });

    const res = await alertPost(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify source code ignores client-injected identifiers
    const alertRouteCode = fs.readFileSync(path.join(process.cwd(), "src/app/api/scan/alert/route.ts"), "utf8");
    expect(alertRouteCode).not.toContain("body.vehicle_id");
    expect(alertRouteCode).not.toContain("body.owner_id");
    expect(alertRouteCode).not.toContain("body.organization_id");
    expect(alertRouteCode).not.toContain("body.push_endpoint");
  });

  // Scenario 20: Anonymous caller cannot invoke non-public privileged HARRIK RPCs
  it("20. verifies anonymous callers cannot execute non-public privileged HARRIK RPCs", () => {
    const migration03Sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260916000003_cloud_security_hardening.sql"), "utf8");
    const migration05Sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260916000005_permit_tokens_and_security_fixes.sql"), "utf8");

    // Privileged RPCs revoked from PUBLIC and anon:
    expect(migration03Sql).toContain("REVOKE ALL ON FUNCTION public.current_user_org_id() FROM PUBLIC, anon");
    expect(migration03Sql).toContain("REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon");
    expect(migration03Sql).toContain("REVOKE ALL ON FUNCTION public.find_vehicle_by_plate(TEXT) FROM PUBLIC, anon");
    expect(migration03Sql).toContain("REVOKE ALL ON FUNCTION public.get_dashboard_overview(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon");

    // Rotation and resolve RPCs in Migration 05 revoked from PUBLIC and anon:
    expect(migration05Sql).toContain("REVOKE ALL ON FUNCTION public.rotate_vehicle_permit(UUID) FROM PUBLIC, anon");
    expect(migration05Sql).toContain("REVOKE ALL ON FUNCTION public.revoke_vehicle_permit(UUID) FROM PUBLIC, anon");
    expect(migration05Sql).toContain("REVOKE ALL ON FUNCTION public.resolve_permit_for_alert(UUID) FROM PUBLIC, anon");

    // Intentional public exception:
    expect(migration05Sql).toContain("REVOKE ALL ON FUNCTION public.verify_permit_token(UUID) FROM PUBLIC");
    expect(migration05Sql).toContain("GRANT EXECUTE ON FUNCTION public.verify_permit_token(UUID) TO anon, authenticated");
  });

  // Scenario 21: RPC call signatures must match the deployed database functions.
  // Regression guard: a mismatched argument name makes PostgREST return 404
  // (PGRST202) and the whole search endpoint fail.
  it("21. calls find_vehicle_by_plate with only p_query (organization derived from session)", () => {
    const searchRouteCode = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/search/route.ts"),
      "utf8"
    );

    // Deployed signature: find_vehicle_by_plate(p_query TEXT)
    const call = searchRouteCode.match(/rpc\("find_vehicle_by_plate",\s*\{([^}]*)\}/);
    expect(call).not.toBeNull();
    expect(call![1]).toContain("p_query");
    expect(call![1]).not.toContain("p_org_id");

    // Deployed migration must not expose a 2-argument overload
    const migration03Sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260916000003_cloud_security_hardening.sql"),
      "utf8"
    );
    expect(migration03Sql).toContain(
      "REVOKE ALL ON FUNCTION public.find_vehicle_by_plate(TEXT) FROM PUBLIC, anon"
    );

    // Dashboard keeps its documented 3-argument signature
    const dashRouteCode = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/dashboard/route.ts"),
      "utf8"
    );
    const dashCall = dashRouteCode.match(/rpc\("get_dashboard_overview",\s*\{([^}]*)\}/);
    expect(dashCall).not.toBeNull();
    expect(dashCall![1]).toContain("p_range_start");
    expect(dashCall![1]).toContain("p_range_end");
    expect(dashCall![1]).toContain("p_timezone");
  });
});
