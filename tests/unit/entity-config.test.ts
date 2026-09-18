import { describe, it, expect } from "vitest";
import {
  ENTITY_PRESETS,
  getEntityPreset,
  formatWhatsappMessage,
  EntityType,
} from "../../src/lib/entity-config";
import { generateWhatsAppLink } from "../../src/lib/whatsapp";
import { translations } from "../../src/i18n/translations";

describe("Entity Configuration & Multi-Tenant Presets", () => {
  const EXPECTED_TYPES: EntityType[] = [
    "educational",
    "commercial_tower",
    "residential_complex",
    "corporate",
    "government",
    "healthcare",
    "mall",
    "other",
  ];

  it("contains all 8 standard facility categories with complete localization", () => {
    expect(ENTITY_PRESETS).toHaveLength(8);

    for (const type of EXPECTED_TYPES) {
      const preset = ENTITY_PRESETS.find((p) => p.type === type);
      expect(preset).toBeDefined();
      expect(preset?.labelAr).toBeTruthy();
      expect(preset?.labelEn).toBeTruthy();
      expect(preset?.venueLabelAr).toBeTruthy();
      expect(preset?.memberLabelAr).toBeTruthy();
      expect(preset?.memberLabelEn).toBeTruthy();
      expect(preset?.memberSingleAr).toBeTruthy();
      expect(preset?.memberSingleEn).toBeTruthy();
      expect(preset?.directoryLabelAr).toBeTruthy();
      expect(preset?.directoryLabelEn).toBeTruthy();
      expect(preset?.unitLabelAr).toBeTruthy();
      expect(preset?.unitLabelEn).toBeTruthy();
      expect(preset?.unitLabelPluralAr).toBeTruthy();
      expect(preset?.unitLabelPluralEn).toBeTruthy();
      expect(preset?.identifierLabelAr).toBeTruthy();
      expect(preset?.identifierLabelEn).toBeTruthy();
      expect(preset?.visitorLabelAr).toBeTruthy();
      expect(preset?.visitorLabelEn).toBeTruthy();
      expect(preset?.securityLabelAr).toBeTruthy();
      expect(preset?.securityLabelEn).toBeTruthy();
      expect(preset?.facilityLabelAr).toBeTruthy();
      expect(preset?.facilityLabelEn).toBeTruthy();
      expect(preset?.emptyStateAr).toBeTruthy();
      expect(preset?.emptyStateEn).toBeTruthy();
      expect(preset?.presetSummaryAr).toBeTruthy();
      expect(preset?.presetSummaryEn).toBeTruthy();
      expect(preset?.defaultWhatsappTemplate).toContain("{plate}");
      expect(preset?.defaultWhatsappTemplate).toContain("{venue_name}");
    }
  });

  it("verifies normalized Level B terminology across all 8 presets", () => {
    const educational = getEntityPreset("educational");
    expect(educational.memberLabelAr).toBe("الكادر والموظفون");
    expect(educational.memberLabelEn).toBe("Staff Members");
    expect(educational.directoryLabelAr).toBe("الكادر والموظفون");
    expect(educational.directoryLabelEn).toBe("Staff Members");
    expect(educational.emptyStateAr).toBe("لا يوجد أفراد من الكادر مسجلون بعد");
    expect(educational.emptyStateEn).toBe("No staff members registered yet");

    const residential = getEntityPreset("residential_complex");
    expect(residential.venueLabelAr).toBe("المجمع السكني");
    expect(residential.memberLabelAr).toBe("السكان والمُلّاك");
    expect(residential.memberLabelEn).toBe("Residents & Owners");
    expect(residential.directoryLabelAr).toBe("السكان والمُلّاك");
    expect(residential.directoryLabelEn).toBe("Residents & Owners");
    expect(residential.emptyStateAr).toBe("لا يوجد سكان أو مُلّاك مسجلون بعد");
    expect(residential.emptyStateEn).toBe("No residents or owners registered yet");
    expect(residential.identifierLabelAr).toBe("رقم الوحدة / الفيلّا");
    expect(residential.unitLabelAr).toBe("المبنى / المنطقة");

    const tower = getEntityPreset("commercial_tower");
    expect(tower.venueLabelAr).toBe("البرج");
    expect(tower.memberLabelAr).toBe("الشاغلون والمستأجرون");
    expect(tower.memberLabelEn).toBe("Occupants & Tenants");
    expect(tower.directoryLabelAr).toBe("الشاغلون والمستأجرون");
    expect(tower.directoryLabelEn).toBe("Occupants & Tenants");
    expect(tower.emptyStateAr).toBe("لا يوجد شاغلون أو مستأجرون مسجلون بعد");
    expect(tower.emptyStateEn).toBe("No occupants or tenants registered yet");
    expect(tower.identifierLabelAr).toBe("رقم المكتب / البطاقة");

    const corporate = getEntityPreset("corporate");
    expect(corporate.memberLabelAr).toBe("الموظفون");
    expect(corporate.memberLabelEn).toBe("Employees");
    expect(corporate.directoryLabelAr).toBe("الموظفون");
    expect(corporate.directoryLabelEn).toBe("Employees");
    expect(corporate.emptyStateAr).toBe("لا يوجد موظفون مسجلون بعد");
    expect(corporate.emptyStateEn).toBe("No employees registered yet");

    const government = getEntityPreset("government");
    expect(government.memberLabelAr).toBe("الموظفون والمنتسبون");
    expect(government.memberLabelEn).toBe("Staff & Personnel");
    expect(government.directoryLabelAr).toBe("الموظفون والمنتسبون");
    expect(government.directoryLabelEn).toBe("Staff & Personnel");
    expect(government.emptyStateAr).toBe("لا يوجد موظفون أو منتسبون مسجلون بعد");
    expect(government.emptyStateEn).toBe("No personnel registered yet");

    const healthcare = getEntityPreset("healthcare");
    expect(healthcare.memberLabelAr).toBe("الكادر");
    expect(healthcare.memberLabelEn).toBe("Staff");
    expect(healthcare.directoryLabelAr).toBe("الكادر");
    expect(healthcare.directoryLabelEn).toBe("Staff");
    expect(healthcare.emptyStateAr).toBe("لا يوجد أفراد من الكادر مسجلون بعد");
    expect(healthcare.emptyStateEn).toBe("No staff registered yet");

    const mall = getEntityPreset("mall");
    expect(mall.memberLabelAr).toBe("المستأجرون والعاملون");
    expect(mall.memberLabelEn).toBe("Tenants & Staff");
    expect(mall.directoryLabelAr).toBe("المستأجرون والعاملون");
    expect(mall.directoryLabelEn).toBe("Tenants & Staff");
    expect(mall.emptyStateAr).toBe("لا يوجد مستأجرون أو عاملون مسجلون بعد");
    expect(mall.emptyStateEn).toBe("No tenants or staff registered yet");

    const other = getEntityPreset("other");
    expect(other.memberLabelAr).toBe("الأفراد المصرح لهم");
    expect(other.memberLabelEn).toBe("Authorized Members");
    expect(other.directoryLabelAr).toBe("الأفراد المصرح لهم");
    expect(other.directoryLabelEn).toBe("Authorized Members");
    expect(other.emptyStateAr).toBe("لا يوجد أفراد مصرح لهم مسجلون بعد");
    expect(other.emptyStateEn).toBe("No authorized members registered yet");
  });

  it("gracefully falls back to 'other' (Authorized Members) for invalid or missing types", () => {
    const nullType = getEntityPreset(null);
    expect(nullType.type).toBe("other");
    expect(nullType.memberLabelAr).toBe("الأفراد المصرح لهم");
    expect(nullType.memberLabelEn).toBe("Authorized Members");

    const undefinedType = getEntityPreset(undefined);
    expect(undefinedType.type).toBe("other");
    expect(undefinedType.memberLabelAr).toBe("الأفراد المصرح لهم");
    expect(undefinedType.memberLabelEn).toBe("Authorized Members");

    const unknownType = getEntityPreset("non_existent_type" as any);
    expect(unknownType.type).toBe("other");
    expect(unknownType.memberLabelAr).toBe("الأفراد المصرح لهم");
    expect(unknownType.memberLabelEn).toBe("Authorized Members");
  });

  it("replaces template variables accurately in formatWhatsappMessage", () => {
    const template =
      "مرحباً، سيارتكم {plate} تغلق الموقف في {venue_name}. يرجى تحريكها.";
    const result = formatWhatsappMessage(template, {
      plate: "998877",
      venue_name: "برج تورنادو",
    });

    expect(result).toBe(
      "مرحباً، سيارتكم 998877 تغلق الموقف في برج تورنادو. يرجى تحريكها."
    );
  });

  it("generates WhatsApp links with dynamic venue names", () => {
    const link = generateWhatsAppLink({
      plateNumber: "654321",
      phone: "55001122",
      type: "BLOCKING",
      language: "ar",
      venueName: "برج البدع",
    });

    const decoded = decodeURIComponent(link);
    expect(decoded).toContain("في مواقف برج البدع");
    expect(decoded).toContain("654321");
  });

  it("regression: ensures universal translations contain zero legacy school references in general UI", () => {
    expect(translations.ar.noResultSubtitle).toContain("قاعدة بيانات المنشأة");
    expect(translations.en.noResultSubtitle).toContain("facility database");
    expect(translations.ar.dashboardOverviewTitle).toBe("نظرة عامة على حركة المواقف");
    expect(translations.en.dashboardOverviewTitle).toBe("Facility Parking Overview");
    expect(translations.ar.metric_registeredStaff).toBe("الأفراد المسجلون");
    expect(translations.en.metric_registeredStaff).toBe("Registered Members");

    // Ensure non-educational presets do not contain 'مدرسة' or 'معلمين'
    const nonEducationalPresets = ENTITY_PRESETS.filter((p) => p.type !== "educational");
    for (const preset of nonEducationalPresets) {
      expect(preset.memberLabelAr).not.toContain("معلم");
      expect(preset.memberLabelAr).not.toContain("مدرسة");
      expect(preset.venueLabelAr).not.toContain("مدرسة");
      expect(preset.directoryLabelAr).not.toContain("معلم");
    }
  });
});
