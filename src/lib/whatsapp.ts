/**
 * حَرِّك | HARRIK — WhatsApp Deep-Link & Phone Contact Generator
 */

export type AlertTypeCode =
  | "BLOCKING"
  | "LIGHTS_ON"
  | "WINDOW_OPEN"
  | "CHECK_VEHICLE"
  | "CONTACT_ME";

export interface ContactMessageOptions {
  plateNumber: string;
  phone: string;
  type?: AlertTypeCode;
  language?: "ar" | "en";
  countryCode?: string;
}

const ARABIC_TEMPLATES: Record<AlertTypeCode, (plate: string) => string> = {
  BLOCKING: (plate) =>
    `السلام عليكم، سيارتك رقم ${plate} حاجزة سيارتي في موقف المدرسة. لو سمحت محتاج أحرك سيارتي. شكرًا لك.`,
  LIGHTS_ON: (plate) =>
    `السلام عليكم، للتكرم بالعلم بأن أنوار سيارتك رقم ${plate} في موقف المدرسة مفتوحة. شكرًا لك.`,
  WINDOW_OPEN: (plate) =>
    `السلام عليكم، للتكرم بالعلم بأن نافذة سيارتك رقم ${plate} في موقف المدرسة مفتوحة. شكرًا لك.`,
  CHECK_VEHICLE: (plate) =>
    `السلام عليكم، يرجى التوجه إلى سيارتك رقم ${plate} في موقف المدرسة للتأكد من وضعها. شكرًا لك.`,
  CONTACT_ME: (plate) =>
    `السلام عليكم، بخصوص سيارتك رقم ${plate} في موقف المدرسة، يرجى التواصل معي عند الإمكان. شكرًا لك.`,
};

const ENGLISH_TEMPLATES: Record<AlertTypeCode, (plate: string) => string> = {
  BLOCKING: (plate) =>
    `Hi, your vehicle ${plate} is currently blocking my car in the school parking area. Could you please come to the parking area? Thank you.`,
  LIGHTS_ON: (plate) =>
    `Hi, just letting you know that the lights are on in your vehicle ${plate} in the school parking area. Thank you.`,
  WINDOW_OPEN: (plate) =>
    `Hi, just letting you know that a window is open on your vehicle ${plate} in the school parking area. Thank you.`,
  CHECK_VEHICLE: (plate) =>
    `Hi, please check your vehicle ${plate} in the school parking area when convenient. Thank you.`,
  CONTACT_ME: (plate) =>
    `Hi, regarding your vehicle ${plate} in the school parking area, please contact me when possible. Thank you.`,
};

/**
 * Normalizes phone numbers for Qatari and international mobile formats.
 * e.g., '+974 5512 3456' -> '97455123456'
 *       '55123456' -> '97455123456'
 */
export function normalizePhoneNumber(
  rawPhone: string | null | undefined,
  defaultCountryCode: string = "974"
): string {
  if (!rawPhone) return "";

  // Strip non-digit characters
  let digits = rawPhone.replace(/\D/g, "");

  // Remove leading 00 if present
  if (digits.startsWith("00")) {
    digits = digits.substring(2);
  }

  // If local Qatari 8-digit number (e.g. 5xxxxxxx, 6xxxxxxx, 7xxxxxxx, 3xxxxxxx)
  const cleanCountryCode = defaultCountryCode.replace(/\D/g, "");
  if (digits.length === 8 && !digits.startsWith(cleanCountryCode)) {
    digits = `${cleanCountryCode}${digits}`;
  }

  return digits;
}

/**
 * Generates an authoritative WhatsApp deep link with prepared message.
 */
export function generateWhatsAppLink(options: ContactMessageOptions): string {
  const {
    plateNumber,
    phone,
    type = "BLOCKING",
    language = "ar",
    countryCode = "974",
  } = options;

  const normalizedPhone = normalizePhoneNumber(phone, countryCode);
  if (!normalizedPhone) return "";

  const templateMap = language === "en" ? ENGLISH_TEMPLATES : ARABIC_TEMPLATES;
  const templateFn = templateMap[type] || templateMap.BLOCKING;
  const message = templateFn(plateNumber);

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a tel: link for one-tap calling.
 */
export function generateTelLink(
  rawPhone: string | null | undefined,
  countryCode: string = "+974"
): string {
  if (!rawPhone) return "";
  const clean = rawPhone.trim().replace(/[\s\-]+/g, "");
  if (!clean.startsWith("+") && !clean.startsWith("00")) {
    const code = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    return `tel:${code}${clean}`;
  }
  return `tel:${clean}`;
}
