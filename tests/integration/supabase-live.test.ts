import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54331";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("Live Supabase Integration & Security Hardening", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  });

  it("Security 1: Rejects unauthenticated RPC find_vehicle_by_plate", async () => {
    const { data, error } = await client.rpc("find_vehicle_by_plate", {
      p_query: "482731",
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("Security 2: Rejects unauthenticated RPC get_dashboard_overview", async () => {
    const { data, error } = await client.rpc("get_dashboard_overview", {
      p_range_start: new Date(Date.now() - 86400000).toISOString(),
      p_range_end: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("Security 3: Anonymous client gets 0 profiles under RLS", async () => {
    const { data, error } = await client.from("profiles").select("*");
    expect(data?.length ?? 0).toBe(0);
    if (error) {
      expect(error.code).toBe("42501");
    }
  });

  it("Security 4: Anonymous client gets 0 vehicles under RLS", async () => {
    const { data, error } = await client.from("vehicles").select("*");
    expect(data?.length ?? 0).toBe(0);
    if (error) {
      expect(error.code).toBe("42501");
    }
  });

  it("Security 5: Anonymous client gets 0 audit logs under RLS", async () => {
    const { data, error } = await client.from("audit_logs").select("*");
    expect(data?.length ?? 0).toBe(0);
    if (error) {
      expect(error.code).toBe("42501");
    }
  });

  it("Security 6: Anonymous client cannot execute current_user_org_id helper", async () => {
    const { data, error } = await client.rpc("current_user_org_id" as any);
    expect(error).not.toBeNull();
    expect(data).toBeFalsy();
  });

  it("Auth: Successfully authenticates Ahmed Hassan (Admin)", async () => {
    const { data, error } = await client.auth.signInWithPassword({
      email: "ahmed.hassan@school.edu.qa",
      password: "Password123!",
    });

    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
    expect(data.user?.id).toBe("30000000-0000-0000-0000-000000000001");
  });

  it("Search: Authenticated exact search for 482731 returns Ahmed Hassan's vehicle", async () => {
    const { data, error } = await client.rpc("find_vehicle_by_plate", {
      p_query: "482731",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);

    const vehicle = data[0];
    expect(vehicle.plate_number).toBe("482731");
    expect(vehicle.make).toBe("Toyota");
    expect(vehicle.model).toBe("Land Cruiser");
    expect(vehicle.owner_name_ar).toBe("أحمد حسن");
    expect(vehicle.owner_employee_id).toBe("142");
    expect(vehicle.owner_mobile).toBe("+97455123456");
    expect(vehicle.match_type).toBe("exact");
  });

  it("Search: Authenticated partial search for Arabic digits ٢٧٣١ returns 3 vehicles", async () => {
    const { data, error } = await client.rpc("find_vehicle_by_plate", {
      p_query: "٢٧٣١",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(3);

    const plates = data.map((v: any) => v.plate_number);
    expect(plates).toContain("482731");
    expect(plates).toContain("112731");
    expect(plates).toContain("992731");
    expect(data[0].match_type).toBe("partial");
  });

  it("Analytics: Authenticated get_dashboard_overview returns accurate KPI summary", async () => {
    const { data, error } = await client.rpc("get_dashboard_overview", {
      p_range_start: new Date(Date.now() - 7 * 86400000).toISOString(),
      p_range_end: new Date().toISOString(),
      p_timezone: "Asia/Qatar",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.metrics.registeredStaff.value).toBeGreaterThanOrEqual(15);
    expect(data.metrics.registeredVehicles.value).toBeGreaterThanOrEqual(9);
    expect(data.currentIssues).toBeDefined();
    expect(data.organizationId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("Signout: Logging out removes session and re-locks RPCs", async () => {
    await client.auth.signOut();
    const { data, error } = await client.rpc("find_vehicle_by_plate", {
      p_query: "482731",
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
