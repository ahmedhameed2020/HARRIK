/**
 * حَرِّك | HARRIK — the operating window actually affects the analytics.
 *
 * The settings panel has always let an administrator set "ساعات العمل وأوقات
 * الذروة" and told them it tunes the peak analytics and the charts. It did not:
 * the value was stored and only ever read back by the settings screen.
 *
 * The number that was wrong is one people act on. "Peak" was the busiest hour
 * across all 24, so a handful of overnight events could be reported as a
 * school's peak parking hour — and staffing follows that number.
 */
import { describe, it, expect } from "vitest";
import {
  parseHour,
  isWithinOperatingHours,
  pickPeakHour,
  operatingHourRange,
} from "@/lib/analytics/operating-hours";

const point = (hour: number, count: number) => ({ hour, count });

describe("parsing the configured times", () => {
  it("reads HH:MM and rejects anything else", () => {
    expect(parseHour("07:00")).toBe(7);
    expect(parseHour("7:30")).toBe(7);
    expect(parseHour("23:59")).toBe(23);
    expect(parseHour("00:00")).toBe(0);

    expect(parseHour("24:00")).toBeNull();
    expect(parseHour("noon")).toBeNull();
    expect(parseHour("")).toBeNull();
    expect(parseHour(undefined)).toBeNull();
    expect(parseHour(null)).toBeNull();
  });
});

describe("the operating window", () => {
  it("covers a normal daytime shift", () => {
    const hours = { start: "07:00", end: "16:00" };
    expect(isWithinOperatingHours(7, hours)).toBe(true);
    expect(isWithinOperatingHours(15, hours)).toBe(true);
    // `end` is exclusive: 16:00 is closing time, not an operating hour.
    expect(isWithinOperatingHours(16, hours)).toBe(false);
    expect(isWithinOperatingHours(3, hours)).toBe(false);
  });

  it("wraps past midnight for an overnight shift", () => {
    const hours = { start: "22:00", end: "06:00" };
    expect(isWithinOperatingHours(23, hours)).toBe(true);
    expect(isWithinOperatingHours(0, hours)).toBe(true);
    expect(isWithinOperatingHours(5, hours)).toBe(true);
    expect(isWithinOperatingHours(6, hours)).toBe(false);
    expect(isWithinOperatingHours(12, hours)).toBe(false);
  });

  it("has no opinion when the window is unset or unusable", () => {
    // A tenant that never touched the setting must see the old behaviour.
    for (const hour of [0, 3, 13, 23]) {
      expect(isWithinOperatingHours(hour, undefined)).toBe(true);
      expect(isWithinOperatingHours(hour, {})).toBe(true);
      expect(isWithinOperatingHours(hour, { start: "morning", end: "night" })).toBe(true);
      expect(isWithinOperatingHours(hour, { start: "00:00", end: "00:00" })).toBe(true);
    }
  });
});

describe("choosing the peak hour", () => {
  it("ignores out-of-hours spikes", () => {
    const points = [
      point(3, 50), // overnight noise — the bug this fixes
      point(9, 20),
      point(13, 30),
    ];

    expect(pickPeakHour(points, { start: "07:00", end: "16:00" })?.hour).toBe(13);
    // Without a window configured, the old behaviour stands.
    expect(pickPeakHour(points, undefined)?.hour).toBe(3);
  });

  it("falls back to the overall busiest hour when nothing happened in hours", () => {
    const points = [point(2, 8), point(4, 3), point(10, 0)];
    // Better to report the real peak than an empty label.
    expect(pickPeakHour(points, { start: "07:00", end: "16:00" })?.hour).toBe(2);
  });

  it("handles an empty series", () => {
    expect(pickPeakHour([], { start: "07:00", end: "16:00" })).toBeUndefined();
  });

  it("picks an in-hours peak even when it ties an out-of-hours hour", () => {
    const points = [point(3, 10), point(11, 10)];
    expect(pickPeakHour(points, { start: "07:00", end: "16:00" })?.hour).toBe(11);
  });
});

describe("the hours charted in the printable report", () => {
  it("spans the configured window", () => {
    expect(operatingHourRange({ start: "07:00", end: "16:00" })).toEqual([
      7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });

  it("wraps past midnight instead of printing an empty chart", () => {
    // The old hardcoded 06:00-17:00 gave an overnight site nothing to look at.
    expect(operatingHourRange({ start: "22:00", end: "03:00" })).toEqual([22, 23, 0, 1, 2]);
  });

  it("keeps the original 06:00-17:00 span when nothing is configured", () => {
    const legacy = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    expect(operatingHourRange(undefined)).toEqual(legacy);
    expect(operatingHourRange({})).toEqual(legacy);
    expect(operatingHourRange({ start: "09:00", end: "09:00" })).toEqual(legacy);
  });

  it("never returns more than a day of hours", () => {
    expect(operatingHourRange({ start: "00:00", end: "23:00" }).length).toBe(23);
    expect(operatingHourRange({ start: "05:00", end: "04:00" }).length).toBeLessThanOrEqual(24);
  });
});
