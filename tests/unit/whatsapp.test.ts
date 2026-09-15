import { describe, it, expect } from "vitest";
import {
  generateWhatsAppLink,
  generateTelLink,
  normalizePhoneNumber,
} from "../../src/lib/whatsapp";

describe("WhatsApp Deep-Link & Phone Contact Generator", () => {
  it("normalizes Qatari local phone numbers", () => {
    expect(normalizePhoneNumber("55123456")).toBe("97455123456");
    expect(normalizePhoneNumber("+974 5512 3456")).toBe("97455123456");
    expect(normalizePhoneNumber("00974-5512-3456")).toBe("97455123456");
  });

  it("generates Arabic WhatsApp deep-link with blocking message", () => {
    const link = generateWhatsAppLink({
      plateNumber: "482731",
      phone: "+974 5512 3456",
      type: "BLOCKING",
      language: "ar",
    });

    expect(link).toContain("https://wa.me/97455123456?text=");
    expect(decodeURIComponent(link)).toContain(
      "السلام عليكم، سيارتك رقم 482731 حاجزة سيارتي في موقف المدرسة"
    );
  });

  it("generates English WhatsApp deep-link with blocking message", () => {
    const link = generateWhatsAppLink({
      plateNumber: "482731",
      phone: "+974 5512 3456",
      type: "BLOCKING",
      language: "en",
    });

    expect(link).toContain("https://wa.me/97455123456?text=");
    expect(decodeURIComponent(link)).toContain(
      "Hi, your vehicle 482731 is currently blocking my car"
    );
  });

  it("generates valid tel: links", () => {
    expect(generateTelLink("55123456", "+974")).toBe("tel:+97455123456");
    expect(generateTelLink("+974 5512 3456")).toBe("tel:+97455123456");
  });
});
