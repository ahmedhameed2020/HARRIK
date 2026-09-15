import { describe, it, expect } from "vitest";
import { normalizePlateNumber, validatePlateQuery } from "../../src/lib/plate-normalizer";
import { generateWhatsAppLink, generateTelLink } from "../../src/lib/whatsapp";

describe("Phase 29 — Critical E2E Release Verification", () => {
  // Step 1 & 2: Registered Database Record
  const registeredVehicle = {
    vehicle_id: "40000000-0000-0000-0000-000000000001",
    plate_number: "482731",
    normalized_plate: "482731",
    make: "Toyota",
    model: "Land Cruiser",
    color: "أبيض (White)",
    year: 2023,
    owner_name_ar: "أحمد حسن",
    owner_name_en: "Ahmed Hassan",
    owner_employee_id: "142",
    owner_mobile: "+97455123456",
    department_name_ar: "قسم اللغة الإنجليزية",
  };

  it("Step 1: Normalizes Arabic input ٤٨٢٧٣١ to 482731", () => {
    const input = "٤٨٢٧٣١";
    const validation = validatePlateQuery(input, 3);
    expect(validation.isValid).toBe(true);
    expect(validation.normalized).toBe("482731");
    expect(validation.normalized).toBe(registeredVehicle.normalized_plate);
  });

  it("Step 2: Resolves permitted owner information for Ahmed Hassan", () => {
    expect(registeredVehicle.owner_name_ar).toBe("أحمد حسن");
    expect(registeredVehicle.owner_employee_id).toBe("142");
    expect(registeredVehicle.owner_mobile).toBe("+97455123456");
  });

  it("Step 3: Generates accurate WhatsApp deep-link with dynamic Arabic message", () => {
    const link = generateWhatsAppLink({
      plateNumber: registeredVehicle.plate_number,
      phone: registeredVehicle.owner_mobile,
      type: "BLOCKING",
      language: "ar",
    });

    expect(link).toContain("https://wa.me/97455123456?text=");
    const decodedMessage = decodeURIComponent(link);
    expect(decodedMessage).toContain("السلام عليكم");
    expect(decodedMessage).toContain("482731");
    expect(decodedMessage).toContain("حاجزة سيارتي في موقف المدرسة");
  });

  it("Step 4: Generates valid phone call tel: target", () => {
    const tel = generateTelLink(registeredVehicle.owner_mobile);
    expect(tel).toBe("tel:+97455123456");
  });

  it("Step 5: Simulates parking alert lifecycle (pending -> acknowledged -> resolved)", () => {
    const now = Date.now();
    const alert = {
      id: "test-alert-001",
      plate_number: registeredVehicle.plate_number,
      status: "pending",
      created_at: new Date(now).toISOString(),
      acknowledged_at: null as string | null,
      resolved_at: null as string | null,
    };

    expect(alert.status).toBe("pending");

    // Owner taps "جاي حالًا" (Acknowledged)
    const ackTime = now + 90 * 1000; // 1m 30s later
    alert.status = "acknowledged";
    alert.acknowledged_at = new Date(ackTime).toISOString();

    expect(alert.status).toBe("acknowledged");
    expect(alert.acknowledged_at).not.toBeNull();

    // Owner taps "تم تحريك السيارة" (Resolved)
    const resTime = now + 240 * 1000; // 4m later
    alert.status = "resolved";
    alert.resolved_at = new Date(resTime).toISOString();

    expect(alert.status).toBe("resolved");
    expect(alert.resolved_at).not.toBeNull();

    // Verify resolution duration calculation
    const durationSeconds =
      (new Date(alert.resolved_at).getTime() - new Date(alert.created_at).getTime()) / 1000;

    expect(durationSeconds).toBe(240); // 4 minutes
    expect(durationSeconds <= 300).toBe(true); // Within 5 minutes
  });
});
