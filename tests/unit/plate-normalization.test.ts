import { describe, it, expect } from "vitest";
import { normalizePlateNumber, validatePlateQuery } from "../../src/lib/plate-normalizer";

describe("Plate Normalization Engine", () => {
  it("converts Arabic-Indic digits to Western numerals", () => {
    expect(normalizePlateNumber("٤٨٢٧٣١")).toBe("482731");
    expect(normalizePlateNumber("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("converts Persian/Urdu digits to Western numerals", () => {
    expect(normalizePlateNumber("۴۸۲۷۳۱")).toBe("482731");
  });

  it("normalizes mixed Arabic and Western digits", () => {
    expect(normalizePlateNumber("48٢٧31")).toBe("482731");
  });

  it("removes whitespace and punctuation separators", () => {
    expect(normalizePlateNumber(" 48 27 31 ")).toBe("482731");
    expect(normalizePlateNumber("48-27-31")).toBe("482731");
    expect(normalizePlateNumber("48/27/31")).toBe("482731");
    expect(normalizePlateNumber("48.27.31")).toBe("482731");
    expect(normalizePlateNumber("48_27_31")).toBe("482731");
  });

  it("handles null, undefined, and empty string safely", () => {
    expect(normalizePlateNumber(null)).toBe("");
    expect(normalizePlateNumber(undefined)).toBe("");
    expect(normalizePlateNumber("")).toBe("");
    expect(normalizePlateNumber("   ")).toBe("");
  });

  it("validates query min and max lengths", () => {
    expect(validatePlateQuery("48", 3).isValid).toBe(false);
    expect(validatePlateQuery("٤٨", 3).isValid).toBe(false);
    expect(validatePlateQuery("2731", 3).isValid).toBe(true);
    expect(validatePlateQuery("٤٨٢٧٣١", 3).isValid).toBe(true);
  });
});
