import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { normalizePlateNumber } from "../../src/lib/plate-normalizer";
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } from "../../src/lib/push/vapid";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54331";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_ID = "30000000-0000-0000-0000-000000000001";
const STAFF_ID = "30000000-0000-0000-0000-000000000003";

describe("HARRIK V1.0 - Enterprise Features Integration Suite", () => {
  let adminClient: ReturnType<typeof createClient>;
  let staffClient: ReturnType<typeof createClient>;
  let serviceClient: ReturnType<typeof createClient>;

  let createdVisitorPassId: string | null = null;
  let createdPushSubId: string | null = null;

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
    if (createdVisitorPassId) {
      await serviceClient.from("visitor_passes").delete().eq("id", createdVisitorPassId);
    }
    if (createdPushSubId) {
      await serviceClient.from("push_subscriptions").delete().eq("id", createdPushSubId);
    }
  });

  describe("1. VAPID Configuration & Web Push Subscriptions", () => {
    it("provides valid standard VAPID public and private keys", () => {
      expect(VAPID_PUBLIC_KEY).toBeDefined();
      expect(VAPID_PUBLIC_KEY.length).toBeGreaterThan(40);
      expect(VAPID_PRIVATE_KEY).toBeDefined();
      expect(VAPID_PRIVATE_KEY.length).toBeGreaterThan(20);
    });

    it("allows a user to store and query their push subscription", async () => {
      const testEndpoint = `https://fcm.googleapis.com/fcm/send/test-token-${Date.now()}`;
      const { data, error } = await staffClient
        .from("push_subscriptions")
        .insert({
          organization_id: ORG_ID,
          profile_id: STAFF_ID,
          endpoint: testEndpoint,
          p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcPP313T59P15pt0q20ox0Cs0Z86NLw2vRLYgCQVN5TOA",
          auth: "tBHItJI5svbpez7KI4CCXg",
          user_agent: "Vitest-Automated-Runner",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.endpoint).toBe(testEndpoint);
      createdPushSubId = data?.id || null;

      // Check RLS: Staff can see their own subscription
      const { data: ownSubs, error: readErr } = await staffClient
        .from("push_subscriptions")
        .select("*")
        .eq("endpoint", testEndpoint);

      expect(readErr).toBeNull();
      expect(ownSubs?.length).toBe(1);
    });
  });

  describe("2. Visitor Passes & Gate Security Pass Integration", () => {
    it("allows security/admin to issue a temporary visitor pass with plate normalization", async () => {
      const rawPlate = "٩٨٧٦٥٤"; // Eastern Arabic 987654
      const normalized = normalizePlateNumber(rawPlate);
      expect(normalized).toBe("987654");

      const validUntil = new Date(Date.now() + 8 * 3600 * 1000).toISOString();

      const { data, error } = await adminClient
        .from("visitor_passes")
        .insert({
          organization_id: ORG_ID,
          plate_number: rawPlate,
          normalized_plate: normalized,
          visitor_name: "سالم المري (زائر رسمي)",
          visitor_mobile: "+97455001122",
          vehicle_make: "Lexus",
          vehicle_model: "LX570",
          vehicle_color: "ذهبي",
          host_name: "مكتب الإدارة العليا",
          purpose: "اجتماع عمل",
          valid_until: validUntil,
          status: "active",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.normalized_plate).toBe("987654");
      expect(data?.status).toBe("active");
      createdVisitorPassId = data?.id || null;
    });

    it("verifies active visitor pass lookup matches search queries", async () => {
      const { data: activePasses, error } = await serviceClient
        .from("visitor_passes")
        .select("*")
        .eq("organization_id", ORG_ID)
        .eq("status", "active")
        .eq("normalized_plate", "987654");

      expect(error).toBeNull();
      expect(activePasses).toBeDefined();
      expect(activePasses?.length).toBe(1);
      expect(activePasses![0].visitor_name).toContain("سالم المري");
    });
  });

  describe("3. Self-Service Plate Normalization & Multi-Vehicle Integrity", () => {
    it("correctly normalizes diverse plate inputs", () => {
      expect(normalizePlateNumber("  48-27-31  ")).toBe("482731");
      expect(normalizePlateNumber("١٢٣٤٥٦")).toBe("123456");
      expect(normalizePlateNumber("٤٨٢٧٣١")).toBe("482731");
    });
  });
});
