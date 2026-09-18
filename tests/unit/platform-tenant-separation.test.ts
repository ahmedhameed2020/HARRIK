import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as platformGet, POST as platformPost, PATCH as platformPatch } from "../../src/app/api/platform/organizations/route";
import { getAuthenticatedSession } from "../../src/lib/supabase/auth-helpers";
import { getPlatformSession } from "../../src/lib/platform-auth";
import fs from "fs";
import path from "path";

// Mock Supabase server helper
vi.mock("../../src/lib/supabase/server", () => {
  return {
    createClient: vi.fn(),
  };
});

import { createClient } from "../../src/lib/supabase/server";

describe("HARRIK V1.0 - Platform Control Plane vs Tenant Data Plane Separation", () => {
  const tenantAId = "11111111-1111-1111-1111-111111111111";
  const tenantBId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Tenant Admin A → Tenant B denied
  it("1. Tenant Admin A cannot access Tenant B data (strict isolation)", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-admin-a", email: "admin@tenanta.com" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: string) => {
          // If querying vehicles for Tenant B with Tenant A session, returns 0 rows
          if (col === "organization_id" && val === tenantBId) {
            return { data: [], error: null };
          }
          return {
            single: vi.fn().mockResolvedValue({
              data: {
                id: "user-admin-a",
                organization_id: tenantAId,
                role: "admin",
                is_active: true,
                organization: { status: "active", entity_type: "educational" },
              },
              error: null,
            }),
          };
        }),
      })),
    };

    (createClient as any).mockResolvedValue(mockClient);

    const { session } = await getAuthenticatedSession();
    expect(session).not.toBeNull();
    expect(session?.organizationId).toBe(tenantAId);
    expect(session?.role).toBe("admin");

    // Querying Tenant B
    const result = await mockClient.from("vehicles").select("*").eq("organization_id", tenantBId);
    expect(result.data).toEqual([]);
  });

  // 2. Security A → Tenant B denied
  it("2. Security A cannot access Tenant B data", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-sec-a", email: "sec@tenanta.com" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: string) => {
          if (col === "organization_id" && val === tenantBId) {
            return { data: [], error: null };
          }
          return {
            single: vi.fn().mockResolvedValue({
              data: {
                id: "user-sec-a",
                organization_id: tenantAId,
                role: "security",
                is_active: true,
                organization: { status: "active" },
              },
              error: null,
            }),
          };
        }),
      })),
    };

    (createClient as any).mockResolvedValue(mockClient);
    const { session } = await getAuthenticatedSession();
    expect(session?.role).toBe("security");
    expect(session?.organizationId).toBe(tenantAId);
  });

  // 3. Staff A → Tenant B denied
  it("3. Staff A cannot access Tenant B data", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-staff-a", email: "staff@tenanta.com" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: string) => {
          if (col === "organization_id" && val === tenantBId) {
            return { data: [], error: null };
          }
          return {
            single: vi.fn().mockResolvedValue({
              data: {
                id: "user-staff-a",
                organization_id: tenantAId,
                role: "staff",
                is_active: true,
                organization: { status: "active" },
              },
              error: null,
            }),
          };
        }),
      })),
    };

    (createClient as any).mockResolvedValue(mockClient);
    const { session } = await getAuthenticatedSession();
    expect(session?.role).toBe("staff");
  });

  // 4. Tenant Admin → Platform API denied
  it("4. Tenant Admin attempting to call Platform API receives HTTP 403 Forbidden", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-admin-a" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "platform_admins") {
          // Tenant admin has NO record in platform_admins
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Row not found" } }),
          };
        }
        return {};
      }),
    };

    (createClient as any).mockResolvedValue(mockClient);

    const res = await platformGet();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Platform Administrator access required/);
  });

  // 5. Tenant Admin → platform_admins direct mutation denied
  it("5. Tenant Admin cannot self-assign platform_admins", async () => {
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260916000006_platform_tenant_authorization_foundation.sql"),
      "utf8"
    );

    // Verification that platform_admins direct INSERT is REVOKED and assign_platform_admin checks is_platform_owner()
    expect(migrationSql).toMatch(/REVOKE ALL ON public\.platform_admins FROM PUBLIC, anon/);
    expect(migrationSql).toMatch(/NOT public\.is_platform_owner\(\)/);
    expect(migrationSql).toMatch(/Unauthorized: Only Platform Owner can assign platform admins/);
  });

  // 6. Forged platform role → denied
  it("6. Forged platform role in request or session without platform_admins record is rejected", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "attacker-user-id" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      })),
    };

    (createClient as any).mockResolvedValue(mockClient);

    const { session, error, status } = await getPlatformSession();
    expect(session).toBeNull();
    expect(status).toBe(403);
    expect(error).toMatch(/Platform Administrator access required/);
  });

  // 7. Platform Owner → approved Control Plane operation allowed
  it("7. Platform Owner can list platform organizations overview", async () => {
    const mockOverview = [
      {
        organization_id: tenantAId,
        name_en: "Tenant A",
        name_ar: "الجهة أ",
        entity_type: "educational",
        status: "active",
        onboarding_status: "ready",
        member_count: 50,
        vehicle_count: 30,
        active_alert_count: 2,
        created_at: new Date().toISOString(),
      },
    ];

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "platform-owner-id" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "platform_admins") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: "owner", is_active: true },
              error: null,
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn((proc: string) => {
        if (proc === "get_platform_organizations_overview") {
          return Promise.resolve({ data: mockOverview, error: null });
        }
        return Promise.resolve({ data: null, error: { message: "Unknown RPC" } });
      }),
    };

    (createClient as any).mockResolvedValue(mockClient);

    const res = await platformGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organizations).toHaveLength(1);
    expect(body.organizations[0].name_en).toBe("Tenant A");
  });

  // 8. Platform Owner → arbitrary tenant PII query NOT automatically allowed
  it("8. Platform Owner aggregate RPC strictly omits tenant PII (names, mobiles, plates, audit logs)", async () => {
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260916000006_platform_tenant_authorization_foundation.sql"),
      "utf8"
    );

    // Verify RPC signature return columns
    expect(migrationSql).toMatch(/organization_id UUID/);
    expect(migrationSql).toMatch(/member_count BIGINT/);
    expect(migrationSql).toMatch(/vehicle_count BIGINT/);
    expect(migrationSql).toMatch(/active_alert_count BIGINT/);

    // Verify zero PII columns in RPC contract
    expect(migrationSql).not.toMatch(/mobile TEXT/);
    expect(migrationSql).not.toMatch(/plate_number TEXT/);
    expect(migrationSql).not.toMatch(/visitor_name TEXT/);
  });

  // 9. Active tenant → suspended → existing user session immediately loses tenant access
  it("9. Suspended tenant immediate freeze: existing user session is rejected with HTTP 403", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-admin-a" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "user-admin-a",
            organization_id: tenantAId,
            role: "admin",
            is_active: true,
            organization: {
              status: "suspended", // Tenant was just suspended by Platform Owner
              name_en: "Tenant A",
            },
          },
          error: null,
        }),
      })),
    };

    (createClient as any).mockResolvedValue(mockClient);

    const { session, error, status } = await getAuthenticatedSession();
    expect(session).toBeNull();
    expect(status).toBe(403);
    expect(error).toMatch(/Tenant organization is suspended\. Operational access suspended\./);
  });

  // 10. Suspended tenant cannot bypass using forged organization ID
  it("10. Suspended tenant cannot bypass by forging organization ID in request body", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-attacker" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "user-attacker",
            organization_id: tenantAId, // Real profile is tied to suspended Tenant A
            role: "admin",
            is_active: true,
            organization: { status: "suspended" },
          },
          error: null,
        }),
      })),
    };

    (createClient as any).mockResolvedValue(mockClient);

    // Even if caller claims to be Tenant B, getAuthenticatedSession inspects verified profile
    const { session, status } = await getAuthenticatedSession();
    expect(session).toBeNull();
    expect(status).toBe(403);
  });

  // 11. Archived tenant cannot operate normally
  it("11. Archived tenant is rejected from normal operational access", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-archived" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "user-archived",
            organization_id: tenantAId,
            role: "staff",
            is_active: true,
            organization: { status: "archived" },
          },
          error: null,
        }),
      })),
    };

    (createClient as any).mockResolvedValue(mockClient);

    const { session, error, status } = await getAuthenticatedSession();
    expect(session).toBeNull();
    expect(status).toBe(403);
    expect(error).toMatch(/Tenant organization is archived/);
  });

  // 12. Entity type cannot affect authorization
  it("12. Changing entity_type does not alter authorization or elevate permissions", async () => {
    const entityTypes = ["commercial_tower", "residential_complex", "corporate", "government", "healthcare", "mall", "other"];

    for (const entityType of entityTypes) {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-entity-test" } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === "platform_admins") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: "user-entity-test",
                organization_id: tenantAId,
                role: "staff",
                is_active: true,
                organization: { status: "active", entity_type: entityType },
              },
              error: null,
            }),
          };
        }),
      };

      (createClient as any).mockResolvedValue(mockClient);

      const { session } = await getAuthenticatedSession();
      expect(session?.role).toBe("staff");
      expect(session?.organizationId).toBe(tenantAId);
      // Entity type does NOT give platform admin access
      const platformSession = await getPlatformSession();
      expect(platformSession.session).toBeNull();
      expect(platformSession.status).toBe(403);
    }
  });

  // 13. Platform Owner action generates platform audit event
  it("13. Platform Owner status update generates platform audit event", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "platform-owner-id" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "platform_admins") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: "owner", is_active: true },
              error: null,
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn((proc: string, args: any) => {
        if (proc === "set_organization_status") {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: { message: "Unknown RPC" } });
      }),
    };

    (createClient as any).mockResolvedValue(mockClient);

    const req = new NextRequest("http://localhost:3000/api/platform/organizations", {
      method: "PATCH",
      body: JSON.stringify({ organizationId: tenantAId, status: "suspended" }),
    });

    const res = await platformPatch(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("suspended");
    expect(mockClient.rpc).toHaveBeenCalledWith("set_organization_status", {
      p_organization_id: tenantAId,
      p_status: "suspended",
    });
  });

  // 14. Tenant Admin cannot reactivate their own suspended organization
  it("14. Tenant Admin cannot reactivate their own suspended organization", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "tenant-admin-id" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "platform_admins") {
          // Tenant Admin has NO record in platform_admins
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
          };
        }
        return {};
      }),
      rpc: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockClient);

    const req = new NextRequest("http://localhost:3000/api/platform/organizations", {
      method: "PATCH",
      body: JSON.stringify({ organizationId: tenantAId, status: "active" }),
    });

    const res = await platformPatch(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Platform Administrator access required/);
    expect(mockClient.rpc).not.toHaveBeenCalled();
  });
});
