import { describe, it, expect } from "vitest";
import { normalizePlateNumber } from "../../src/lib/plate-normalizer";

describe("Bulk Import Validation Engine", () => {
  it("detects duplicate plates with different digit formats", () => {
    const plate1 = "482731";
    const plate2 = "٤٨٢٧٣١";

    expect(normalizePlateNumber(plate1)).toBe(normalizePlateNumber(plate2));
  });

  it("normalizes spaced and dashed plate rows in import data", () => {
    expect(normalizePlateNumber(" 48 27 31 ")).toBe("482731");
    expect(normalizePlateNumber("48-27-31")).toBe("482731");
  });
});
