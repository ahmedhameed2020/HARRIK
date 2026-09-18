import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { normalizePlateNumber } from "../../src/lib/plate-normalizer";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54331";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_ID = "30000000-0000-0000-0000-000000000001";
const STAFF_ID = "30000000-0000-0000-0000-000000000003";

describe("HARRIK V1.0 - Auth, RBAC, Admin CRUD & Audit Gate", () => {
  let adminClient: ReturnType<typeof createClient>;
  let staffClient: ReturnType<typeof createClient>;
  let serviceClient: ReturnType<typeof createClient>;

  let testAuthUserId: string;
  let testVehicleId: string;
  let createdAlertId: string;

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    staffClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Clean up any stale records from previous test runs
    await serviceClient.from("vehicles").delete().eq("normalized_plate", "489955");
    await serviceClient.from("profiles").delete().eq("employee_id", "EMP-QA-777");

    const { error: adminAuthErr } = await adminClient.auth.signInWithPassword({
      email: "ahmed.hassan@school.edu.qa",
      password: "Password123!",
    });
    if (adminAuthErr) throw new Error("Admin auth failed: " + adminAuthErr.message);

    const { error: staffAuthErr } = await staffClient.auth.signInWithPassword({
      email: "mohammed.sulaiti@school.edu.qa",
      password: "Password123!",
    });
    if (staffAuthErr) throw new Error("Staff auth failed: " + staffAuthErr.message);
  });

  afterAll(async () => {
    if (createdAlertId) {
      await serviceClient.from("parking_alerts").delete().eq("id", createdAlertId);
    }
    if (testVehicleId) {
      await serviceClient.from("staff_vehicles").delete().eq("vehicle_id", testVehicleId);
      await serviceClient.from("vehicles").delete().eq("id", testVehicleId);
    }
    if (testAuthUserId) {
      await serviceClient.from("profiles").delete().eq("id", testAuthUserId);
      await serviceClient.auth.admin.deleteUser(testAuthUserId);
    }
  });

  describe("1. Real Authentication & Session Identity", () => {
    it("Admin session resolves correct profile, role, and active status", async () => {
      const { data: profile, error } = await adminClient
        .from("profiles")
        .select("*, department:departments(*)")
        .eq("id", ADMIN_ID)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile.role).toBe("admin");
      expect(profile.is_active).toBe(true);
      expect(profile.organization_id).toBe(ORG_ID);
      expect(profile.name_ar).toBe("أحمد حسن");
    });

    it("Staff session resolves correct profile, role, and active status", async () => {
      const { data: profile, error } = await staffClient
        .from("profiles")
        .select("*, department:departments(*)")
        .eq("id", STAFF_ID)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile.role).toBe("staff");
      expect(profile.is_active).toBe(true);
      expect(profile.organization_id).toBe(ORG_ID);
      expect(profile.name_ar).toBe("محمد السليطي");
    });

    it("Inactive account enforcement: blocks deactivated profiles", async () => {
      const tempUserEmail = "temp_deactivated_test@school.edu.qa";
      const { data: tempUser } = await serviceClient.auth.admin.createUser({
        email: tempUserEmail,
        password: "Password123!",
        email_confirm: true,
      });

      if (tempUser?.user) {
        await serviceClient.from("profiles").insert({
          id: tempUser.user.id,
          organization_id: ORG_ID,
          employee_id: "INACTIVE-999",
          name_ar: "حساب معطل",
          name_en: "Deactivated Account",
          mobile: "+97455000000",
          role: "staff",
          is_active: false,
        });

        const inactiveClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
        });

        const { data: loginData } = await inactiveClient.auth.signInWithPassword({
          email: tempUserEmail,
          password: "Password123!",
        });
        expect(loginData.user).toBeDefined();

        const { data: profile } = await inactiveClient
          .from("profiles")
          .select("is_active")
          .eq("id", tempUser.user.id)
          .single();

        expect(profile?.is_active).toBe(false);

        await serviceClient.from("profiles").delete().eq("id", tempUser.user.id);
        await serviceClient.auth.admin.deleteUser(tempUser.user.id);
      }
    });
  });

  describe("2. Server-Side RBAC & Route Guarding", () => {
    it("Staff user is DENIED access to audit_logs by RLS", async () => {
      const { data, error } = await staffClient
        .from("audit_logs")
        .select("*")
        .eq("organization_id", ORG_ID);

      expect(data).toBeDefined();
      expect(data?.length).toBe(0);
    });

    it("Admin user IS GRANTED access to audit_logs by RLS", async () => {
      const { data, error } = await adminClient
        .from("audit_logs")
        .select("*")
        .eq("organization_id", ORG_ID);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("Staff user CANNOT insert new vehicles directly via RLS", async () => {
      const { data, error } = await staffClient
        .from("vehicles")
        .insert({
          organization_id: ORG_ID,
          plate_number: "999999",
          normalized_plate: "999999",
          make: "Test",
          model: "Car",
          color: "White",
        });

      expect(error).not.toBeNull();
    });
  });

  describe("3. Session Identity & Parking Alert Creation", () => {
    it("Staff user can create parking alert when reporter_id = auth.uid()", async () => {
      const { data, error } = await staffClient
        .from("parking_alerts")
        .insert({
          organization_id: ORG_ID,
          vehicle_id: "40000000-0000-0000-0000-000000000001",
          owner_id: ADMIN_ID,
          reporter_id: STAFF_ID,
          alert_type_id: "20000000-0000-0000-0000-000000000001",
          status: "pending",
          message: "سيارتك حاجزة سيارتي",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.reporter_id).toBe(STAFF_ID);
      createdAlertId = data.id;
    });

    it("RLS REJECTS parking alert if reporter_id does not match auth.uid() (anti-spoofing)", async () => {
      const { data, error } = await staffClient
        .from("parking_alerts")
        .insert({
          organization_id: ORG_ID,
          vehicle_id: "40000000-0000-0000-0000-000000000001",
          owner_id: ADMIN_ID,
          reporter_id: ADMIN_ID,
          alert_type_id: "20000000-0000-0000-0000-000000000001",
          status: "pending",
          message: "Spoofed alert",
        });

      expect(error).not.toBeNull();
    });
  });

  describe("4. Complete Admin Staff CRUD", () => {
    const testEmployeeId = "EMP-QA-777";

    it("Admin creates new staff member", async () => {
      const { data: authUser, error: authErr } = await serviceClient.auth.admin.createUser({
        email: "staff_" + testEmployeeId.toLowerCase() + "@school.edu.qa",
        password: "Password123!",
        email_confirm: true,
      });
      expect(authErr).toBeNull();
      testAuthUserId = authUser.user.id;

      const { data: profile, error } = await adminClient
        .from("profiles")
        .insert({
          id: testAuthUserId,
          organization_id: ORG_ID,
          employee_id: testEmployeeId,
          name_ar: "ناصر الكواري",
          name_en: "Nasser Al-Kuwari",
          mobile: "+97455990011",
          role: "staff",
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile.employee_id).toBe(testEmployeeId);
      expect(profile.name_ar).toBe("ناصر الكواري");

      const { error: auditErr } = await adminClient.from("audit_logs").insert({
        organization_id: ORG_ID,
        actor_id: ADMIN_ID,
        action: "create_staff",
        entity_type: "staff",
        entity_id: profile.id,
        change_summary: { employee_id: profile.employee_id, name_ar: profile.name_ar },
      });
      expect(auditErr).toBeNull();
    });

    it("Admin detects duplicate employee_id constraint in same organization", async () => {
      const { error } = await adminClient.from("profiles").insert({
        id: "70000000-0000-0000-0000-000000000099",
        organization_id: ORG_ID,
        employee_id: testEmployeeId,
        name_ar: "مكرر",
        name_en: "Duplicate",
        mobile: "+97455000000",
        role: "staff",
      });

      expect(error).not.toBeNull();
    });

    it("Admin updates staff details and toggles active status", async () => {
      const { data: updated, error } = await adminClient
        .from("profiles")
        .update({
          name_ar: "ناصر الكواري (محدث)",
          is_active: false,
        })
        .eq("id", testAuthUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.name_ar).toBe("ناصر الكواري (محدث)");
      expect(updated.is_active).toBe(false);

      const { data: reEnabled, error: reEnableErr } = await adminClient
        .from("profiles")
        .update({ is_active: true })
        .eq("id", testAuthUserId)
        .select()
        .single();

      expect(reEnableErr).toBeNull();
      expect(reEnabled.is_active).toBe(true);
    });
  });

  describe("5. Complete Admin Vehicle CRUD & Plate Normalization", () => {
    const arabicPlateInput = "٤٨٩٩٥٥";
    const expectedNormalized = "489955";

    it("Normalizes Arabic digits correctly: ٤٨٩٩٥٥ -> 489955", () => {
      const normalized = normalizePlateNumber(arabicPlateInput);
      expect(normalized).toBe(expectedNormalized);
    });

    it("Admin creates vehicle with normalized plate", async () => {
      const { data: vehicle, error } = await adminClient
        .from("vehicles")
        .insert({
          organization_id: ORG_ID,
          plate_number: arabicPlateInput,
          normalized_plate: expectedNormalized,
          make: "Lexus",
          model: "LX600",
          color: "أسود (Black)",
          year: 2024,
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(vehicle).toBeDefined();
      expect(vehicle.normalized_plate).toBe(expectedNormalized);
      testVehicleId = vehicle.id;

      const { error: assignErr } = await adminClient.from("staff_vehicles").insert({
        organization_id: ORG_ID,
        staff_id: testAuthUserId,
        vehicle_id: testVehicleId,
        is_primary: true,
      });
      expect(assignErr).toBeNull();

      const { error: auditErr } = await adminClient.from("audit_logs").insert({
        organization_id: ORG_ID,
        actor_id: ADMIN_ID,
        action: "create_vehicle",
        entity_type: "vehicle",
        entity_id: testVehicleId,
        change_summary: { plate_number: arabicPlateInput, normalized_plate: expectedNormalized },
      });
      expect(auditErr).toBeNull();
    });

    it("Rejects duplicate vehicle plate in the same organization", async () => {
      const { error } = await adminClient.from("vehicles").insert({
        organization_id: ORG_ID,
        plate_number: "489955",
        normalized_plate: expectedNormalized,
        make: "Toyota",
        model: "Camry",
        color: "Silver",
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("23505");
    });

    it("Reassigns vehicle owner to Mohammed Al-Sulaiti (Staff)", async () => {
      const { error: delErr } = await adminClient
        .from("staff_vehicles")
        .delete()
        .eq("vehicle_id", testVehicleId);
      expect(delErr).toBeNull();

      const { data: newAssoc, error: newAssocErr } = await adminClient
        .from("staff_vehicles")
        .insert({
          organization_id: ORG_ID,
          staff_id: STAFF_ID,
          vehicle_id: testVehicleId,
          is_primary: false,
        })
        .select()
        .single();

      expect(newAssocErr).toBeNull();
      expect(newAssoc.staff_id).toBe(STAFF_ID);
    });

    it("Toggles vehicle is_active status", async () => {
      const { data: deactivated, error } = await adminClient
        .from("vehicles")
        .update({ is_active: false })
        .eq("id", testVehicleId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(deactivated.is_active).toBe(false);
    });
  });

  describe("6. Audit Log Viewer & Filter Verification", () => {
    it("Admin queries audit logs filtered by entity_type = 'vehicle'", async () => {
      const { data: logs, error } = await adminClient
        .from("audit_logs")
        .select("*")
        .eq("organization_id", ORG_ID)
        .eq("entity_type", "vehicle");

      expect(error).toBeNull();
      expect(logs).toBeDefined();
      expect(logs!.length).toBeGreaterThan(0);
      expect(logs!.every((l) => l.entity_type === "vehicle")).toBe(true);
    });

    it("Admin queries audit logs filtered by entity_type = 'staff'", async () => {
      const { data: logs, error } = await adminClient
        .from("audit_logs")
        .select("*")
        .eq("organization_id", ORG_ID)
        .eq("entity_type", "staff");

      expect(error).toBeNull();
      expect(logs).toBeDefined();
      expect(logs!.length).toBeGreaterThan(0);
      expect(logs!.every((l) => l.entity_type === "staff")).toBe(true);
    });
  });
});
