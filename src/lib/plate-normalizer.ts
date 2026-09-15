/**
 * حَرِّك | HARRIK — Canonical Plate Normalization Engine
 * 
 * Invariants:
 * 1. Converts Arabic-Indic numerals (٠-٩) to Western numerals (0-9).
 * 2. Converts Persian/Urdu numerals (۰-۹) to Western numerals (0-9).
 * 3. Trims leading and trailing whitespace.
 * 4. Strips internal whitespace, dashes, slashes, underscores, and dots.
 * 5. Uppercases any alphanumeric letters.
 * 
 * Examples:
 * - '٤٨٢٧٣١' -> '482731'
 * - '48 27 31' -> '482731'
 * - ' 48-27-31 ' -> '482731'
 */

const ARABIC_INDIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const PERSIAN_URDU_DIGITS: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function normalizePlateNumber(input: string | null | undefined): string {
  if (!input) return "";

  let cleaned = input.trim();

  // Replace Arabic-Indic digits
  cleaned = cleaned.replace(/[٠-٩]/g, (char) => ARABIC_INDIC_DIGITS[char] || char);

  // Replace Persian/Urdu digits
  cleaned = cleaned.replace(/[۰-۹]/g, (char) => PERSIAN_URDU_DIGITS[char] || char);

  // Remove separators (spaces, dashes, slashes, dots, underscores)
  cleaned = cleaned.replace(/[\s\-_/\.]+/g, "");

  // Uppercase for any latin characters
  return cleaned.toUpperCase();
}

/**
 * Validates whether a plate number is acceptable for search or registration.
 */
export function validatePlateQuery(
  query: string,
  minDigits: number = 3,
  maxDigits: number = 10
): { isValid: boolean; normalized: string; error?: string } {
  const normalized = normalizePlateNumber(query);

  if (normalized.length === 0) {
    return { isValid: false, normalized: "", error: "empty_query" };
  }

  if (normalized.length < minDigits) {
    return {
      isValid: false,
      normalized,
      error: `min_digits_${minDigits}`,
    };
  }

  if (normalized.length > maxDigits) {
    return {
      isValid: false,
      normalized,
      error: `max_digits_${maxDigits}`,
    };
  }

  return { isValid: true, normalized };
}
