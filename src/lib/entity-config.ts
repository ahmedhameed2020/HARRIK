/**
 * حَرِّك | HARRIK — Universal Multi-Tenant Entity Presets & Configuration Engine
 * Translates domain concepts (People, Units, Identifiers, Visitors, Messages)
 * dynamically based on the Organization's facility type.
 */

export type EntityType =
  | "educational"
  | "commercial_tower"
  | "residential_complex"
  | "corporate"
  | "government"
  | "healthcare"
  | "mall"
  | "other";

export interface EntityPreset {
  type: EntityType;
  labelAr: string;
  labelEn: string;
  iconName: string;
  venueLabelAr: string;
  venueLabelEn: string;
  memberLabelAr: string;
  memberLabelEn: string;
  memberSingleAr: string;
  memberSingleEn: string;
  directoryLabelAr: string;
  directoryLabelEn: string;
  unitLabelAr: string;
  unitLabelEn: string;
  unitLabelPluralAr: string;
  unitLabelPluralEn: string;
  identifierLabelAr: string;
  identifierLabelEn: string;
  visitorLabelAr: string;
  visitorLabelEn: string;
  securityLabelAr: string;
  securityLabelEn: string;
  facilityLabelAr: string;
  facilityLabelEn: string;
  emptyStateAr: string;
  emptyStateEn: string;
  presetSummaryAr: string;
  presetSummaryEn: string;
  defaultWhatsappTemplate: string;
}

export const ENTITY_PRESETS: EntityPreset[] = [
  {
    type: "educational",
    labelAr: "منشأة تعليمية (مدرسة / جامعة)",
    labelEn: "School / University",
    iconName: "School",
    venueLabelAr: "المدرسة",
    venueLabelEn: "School",
    memberLabelAr: "الكادر والموظفون",
    memberLabelEn: "Staff Members",
    memberSingleAr: "فرد من الكادر",
    memberSingleEn: "Staff Member",
    directoryLabelAr: "الكادر والموظفون",
    directoryLabelEn: "Staff Members",
    unitLabelAr: "القسم الأكاديمي",
    unitLabelEn: "Department",
    unitLabelPluralAr: "كافة الأقسام الأكاديمية",
    unitLabelPluralEn: "Academic Departments",
    identifierLabelAr: "الرقم الوظيفي",
    identifierLabelEn: "Employee ID",
    visitorLabelAr: "الزوار وأولياء الأمور",
    visitorLabelEn: "Visitors & Parents",
    securityLabelAr: "أمن الصرح التعليمي",
    securityLabelEn: "Campus Security",
    facilityLabelAr: "إدارة الصرح التعليمي",
    facilityLabelEn: "School Administration",
    emptyStateAr: "لا يوجد أفراد من الكادر مسجلون بعد",
    emptyStateEn: "No staff members registered yet",
    presetSummaryAr: "الأقسام • الكادر والموظفون • الأمن • أولياء الأمور والزوار",
    presetSummaryEn: "Departments • Faculty & Staff • Security • Visitors",
    defaultWhatsappTemplate:
      "السلام عليكم زميلي العزيز، سيارتك رقم {plate} متوقفة أمام سيارتي وتغلق المسار في مواقف {venue_name}. يرجى التكرم بتحريكها شاكراً لتعاونكم.",
  },
  {
    type: "commercial_tower",
    labelAr: "برج إداري / تجاري",
    labelEn: "Commercial Tower",
    iconName: "Building",
    venueLabelAr: "البرج",
    venueLabelEn: "Tower",
    memberLabelAr: "الشاغلون والمستأجرون",
    memberLabelEn: "Occupants & Tenants",
    memberSingleAr: "شاغل / مستأجر",
    memberSingleEn: "Tenant / Occupant",
    directoryLabelAr: "الشاغلون والمستأجرون",
    directoryLabelEn: "Occupants & Tenants",
    unitLabelAr: "الطابق / الجناح",
    unitLabelEn: "Floor / Suite",
    unitLabelPluralAr: "كافة الطوابق والأجنحة",
    unitLabelPluralEn: "Floors & Suites",
    identifierLabelAr: "رقم المكتب / البطاقة",
    identifierLabelEn: "Office / Badge #",
    visitorLabelAr: "الزوار والعملاء",
    visitorLabelEn: "Visitors & Clients",
    securityLabelAr: "أمن البرج والمواقف",
    securityLabelEn: "Tower Security",
    facilityLabelAr: "إدارة البرج",
    facilityLabelEn: "Tower Property Management",
    emptyStateAr: "لا يوجد شاغلون أو مستأجرون مسجلون بعد",
    emptyStateEn: "No occupants or tenants registered yet",
    presetSummaryAr: "الطوابق • الشاغلون • الأمن • الزوار والمراجعون",
    presetSummaryEn: "Floors • Occupants • Security • Visitors",
    defaultWhatsappTemplate:
      "مرحباً بك، سيارتكم رقم {plate} متوقفة أمام سيارتي وتغلق المسار في مواقف {venue_name}. يرجى التكرم بفتح المسار أو تحريكها شاكرين تعاونكم.",
  },
  {
    type: "residential_complex",
    labelAr: "مجمع سكني / كمباوند",
    labelEn: "Residential Compound",
    iconName: "Home",
    venueLabelAr: "المجمع السكني",
    venueLabelEn: "Compound",
    memberLabelAr: "السكان والمُلّاك",
    memberLabelEn: "Residents & Owners",
    memberSingleAr: "ساكن / مالك",
    memberSingleEn: "Resident",
    directoryLabelAr: "السكان والمُلّاك",
    directoryLabelEn: "Residents & Owners",
    unitLabelAr: "المبنى / المنطقة",
    unitLabelEn: "Building / Zone",
    unitLabelPluralAr: "كافة المباني والمناطق",
    unitLabelPluralEn: "Buildings & Zones",
    identifierLabelAr: "رقم الوحدة / الفيلّا",
    identifierLabelEn: "Unit / Villa #",
    visitorLabelAr: "الضيوف والزوار",
    visitorLabelEn: "Guests & Visitors",
    securityLabelAr: "أمن البوابة والمجمع",
    securityLabelEn: "Gate & Community Security",
    facilityLabelAr: "إدارة المجمع السكني",
    facilityLabelEn: "Community Administration",
    emptyStateAr: "لا يوجد سكان أو مُلّاك مسجلون بعد",
    emptyStateEn: "No residents or owners registered yet",
    presetSummaryAr: "المباني • السكان • الوحدات • الأمن • الضيوف",
    presetSummaryEn: "Buildings • Residents • Units • Security • Guests",
    defaultWhatsappTemplate:
      "السلام عليكم جارنا الكريم، سيارتكم رقم {plate} تغلق الموقف في {venue_name}. نرجو منكم التكرم بتحريكها لتيسير حركة المرور شاكرين حسن جواركم.",
  },
  {
    type: "corporate",
    labelAr: "مقر شركة / بنك",
    labelEn: "Corporate HQ / Bank",
    iconName: "Briefcase",
    venueLabelAr: "المقر الرئيسي",
    venueLabelEn: "Headquarters",
    memberLabelAr: "الموظفون",
    memberLabelEn: "Employees",
    memberSingleAr: "موظف",
    memberSingleEn: "Employee",
    directoryLabelAr: "الموظفون",
    directoryLabelEn: "Employees",
    unitLabelAr: "الإدارة / القطاع",
    unitLabelEn: "Division / Department",
    unitLabelPluralAr: "كافة الإدارات والقطاعات",
    unitLabelPluralEn: "Divisions & Departments",
    identifierLabelAr: "الرقم الوظيفي",
    identifierLabelEn: "Employee ID",
    visitorLabelAr: "العملاء والزوار",
    visitorLabelEn: "Clients & Visitors",
    securityLabelAr: "أمن المقر",
    securityLabelEn: "Corporate Security",
    facilityLabelAr: "إدارة المقر",
    facilityLabelEn: "Corporate Administration",
    emptyStateAr: "لا يوجد موظفون مسجلون بعد",
    emptyStateEn: "No employees registered yet",
    presetSummaryAr: "الإدارات • الموظفون • الأمن • العملاء والزوار",
    presetSummaryEn: "Departments • Employees • Security • Visitors",
    defaultWhatsappTemplate:
      "الزميل الكريم، سيارتكم رقم {plate} متوقفة في مسار مواقف الموظفين بمقر {venue_name}. نرجو التفضل بتحريكها مشكورين.",
  },
  {
    type: "government",
    labelAr: "وزارة / هيئة حكومية",
    labelEn: "Government Ministry / Authority",
    iconName: "Landmark",
    venueLabelAr: "الوزارة / الهيئة",
    venueLabelEn: "Ministry / Authority",
    memberLabelAr: "الموظفون والمنتسبون",
    memberLabelEn: "Staff & Personnel",
    memberSingleAr: "موظف / منتسب",
    memberSingleEn: "Personnel",
    directoryLabelAr: "الموظفون والمنتسبون",
    directoryLabelEn: "Staff & Personnel",
    unitLabelAr: "الإدارة / القسم",
    unitLabelEn: "Department / Directorate",
    unitLabelPluralAr: "كافة الإدارات والأقسام",
    unitLabelPluralEn: "Departments & Directorates",
    identifierLabelAr: "الرقم الوظيفي",
    identifierLabelEn: "Employee ID",
    visitorLabelAr: "المراجعون والزوار",
    visitorLabelEn: "Reviewers & Visitors",
    securityLabelAr: "أمن المنشأة الحكومية",
    securityLabelEn: "Facility Security",
    facilityLabelAr: "إدارة المنشأة الحكومية",
    facilityLabelEn: "Authority Administration",
    emptyStateAr: "لا يوجد موظفون أو منتسبون مسجلون بعد",
    emptyStateEn: "No personnel registered yet",
    presetSummaryAr: "الإدارات • الموظفون • الأمن • المراجعون",
    presetSummaryEn: "Departments • Staff • Security • Public Visitors",
    defaultWhatsappTemplate:
      "السلام عليكم، سيارتكم رقم {plate} متوقفة في مواقف {venue_name} وتعيق حركة السير. يرجى التكرم بنقلها لموقف متاح لتسهيل حركة المراجعين.",
  },
  {
    type: "healthcare",
    labelAr: "مستشفى / مركز طبي",
    labelEn: "Hospital / Healthcare Center",
    iconName: "HeartPulse",
    venueLabelAr: "المستشفى",
    venueLabelEn: "Hospital",
    memberLabelAr: "الكادر",
    memberLabelEn: "Staff",
    memberSingleAr: "فرد من الكادر",
    memberSingleEn: "Staff Member",
    directoryLabelAr: "الكادر",
    directoryLabelEn: "Staff",
    unitLabelAr: "القسم / العيادة",
    unitLabelEn: "Department / Ward",
    unitLabelPluralAr: "كافة الأقسام والعيادات",
    unitLabelPluralEn: "Departments & Wards",
    identifierLabelAr: "رقم الكادر / الملف",
    identifierLabelEn: "Staff / Badge #",
    visitorLabelAr: "المرضى والمرافقون",
    visitorLabelEn: "Patients & Companions",
    securityLabelAr: "أمن المستشفى ومسار الطوارئ",
    securityLabelEn: "Hospital & Emergency Security",
    facilityLabelAr: "إدارة المستشفى",
    facilityLabelEn: "Hospital Administration",
    emptyStateAr: "لا يوجد أفراد من الكادر مسجلون بعد",
    emptyStateEn: "No staff registered yet",
    presetSummaryAr: "الأقسام • الكادر الطبي • مسار الطوارئ • الزوار والمرضى",
    presetSummaryEn: "Wards • Medical Staff • Emergency • Visitors",
    defaultWhatsappTemplate:
      "تنبيه عاجل من أمن مواقف {venue_name}: سيارتكم رقم {plate} متوقفة في مسار حيوي. نرجو التوجه فوراً لنقلها لتسهيل حركة سيارات الإسعاف والمرضى.",
  },
  {
    type: "mall",
    labelAr: "مركز تسوق / مول",
    labelEn: "Shopping Mall",
    iconName: "ShoppingBag",
    venueLabelAr: "المول",
    venueLabelEn: "Shopping Mall",
    memberLabelAr: "المستأجرون والعاملون",
    memberLabelEn: "Tenants & Staff",
    memberSingleAr: "مستأجر / عامل",
    memberSingleEn: "Tenant Staff",
    directoryLabelAr: "المستأجرون والعاملون",
    directoryLabelEn: "Tenants & Staff",
    unitLabelAr: "المنطقة / المتجر",
    unitLabelEn: "Zone / Store",
    unitLabelPluralAr: "كافة المناطق والمتاجر",
    unitLabelPluralEn: "Zones & Stores",
    identifierLabelAr: "رقم المتجر / المحل",
    identifierLabelEn: "Store / Unit #",
    visitorLabelAr: "المتسوقون والزوار",
    visitorLabelEn: "Shoppers & Guests",
    securityLabelAr: "أمن ومراقبة المواقف",
    securityLabelEn: "Mall Security",
    facilityLabelAr: "إدارة المركز التجاري",
    facilityLabelEn: "Mall Management",
    emptyStateAr: "لا يوجد مستأجرون أو عاملون مسجلون بعد",
    emptyStateEn: "No tenants or staff registered yet",
    presetSummaryAr: "المتاجر • المستأجرون • الأمن • المتسوقون والزوار",
    presetSummaryEn: "Retailers • Staff • Security • Shoppers",
    defaultWhatsappTemplate:
      "عميلنا العزيز في {venue_name}، نود إبلاغكم بأن سيارتكم رقم {plate} متوقفة بشكل يعيق حركة المتسوقين، يرجى التكرم بتحريكها مع أطيب التحيات.",
  },
  {
    type: "other",
    labelAr: "منشأة عامة / أخرى",
    labelEn: "General / Custom Facility",
    iconName: "Globe",
    venueLabelAr: "المنشأة",
    venueLabelEn: "Facility",
    memberLabelAr: "الأفراد المصرح لهم",
    memberLabelEn: "Authorized Members",
    memberSingleAr: "فرد مصرح له",
    memberSingleEn: "Authorized Member",
    directoryLabelAr: "الأفراد المصرح لهم",
    directoryLabelEn: "Authorized Members",
    unitLabelAr: "الوحدة / القسم",
    unitLabelEn: "Unit / Section",
    unitLabelPluralAr: "كافة الوحدات والأقسام",
    unitLabelPluralEn: "All Units & Sections",
    identifierLabelAr: "رقم المعرّف / العضوية",
    identifierLabelEn: "Member / ID #",
    visitorLabelAr: "الزوار والضيوف",
    visitorLabelEn: "Visitors & Guests",
    securityLabelAr: "أمن المنشأة",
    securityLabelEn: "Facility Security",
    facilityLabelAr: "إدارة المنشأة",
    facilityLabelEn: "Facility Administration",
    emptyStateAr: "لا يوجد أفراد مصرح لهم مسجلون بعد",
    emptyStateEn: "No authorized members registered yet",
    presetSummaryAr: "الوحدات • الأفراد المصرح لهم • الأمن • الزوار",
    presetSummaryEn: "Units • Authorized Members • Security • Visitors",
    defaultWhatsappTemplate:
      "السلام عليكم، سيارتكم رقم {plate} متوقفة في مواقف {venue_name} وتعيق حركة السير. يرجى التكرم بتحريكها لتسهيل خروج السيارات الأخرى.",
  },
];

/**
 * Resolves the active preset based on entity type, with fallback to "other" (Authorized Members)
 */
export function getEntityPreset(type?: string | null): EntityPreset {
  const fallback = ENTITY_PRESETS.find((p) => p.type === "other") || ENTITY_PRESETS[7];
  if (!type) {
    return fallback;
  }
  const found = ENTITY_PRESETS.find((p) => p.type === type);
  return found || fallback;
}

/**
 * Replaces placeholders in a WhatsApp template string
 */
export function formatWhatsappMessage(
  template: string,
  variables: { plate: string; venue_name?: string }
): string {
  return template
    .replace(/{plate}/g, variables.plate)
    .replace(/{venue_name}/g, variables.venue_name || "المنشأة");
}
