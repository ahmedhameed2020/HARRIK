import { describe, it, expect } from "vitest";
import {
  buildDashboardSeries,
  hourLabel,
  parseRange,
  rangeStart,
  share,
  QATAR_UTC_OFFSET_MINUTES,
} from "@/lib/analytics/dashboard-series";

/** 2026-09-20 12:00 in Doha (UTC+03:00). */
const NOW = new Date("2026-09-20T09:00:00Z");

describe("dashboard series — range handling", () => {
  it("defaults to the 7-day window for unknown input", () => {
    expect(parseRange("nonsense")).toBe("week");
    expect(parseRange(null)).toBe("week");
    expect(parseRange("month")).toBe("month");
  });

  it("uses a fixed Qatar offset of +03:00", () => {
    expect(QATAR_UTC_OFFSET_MINUTES).toBe(180);
  });

  it("starts the today window at Qatar midnight", () => {
    expect(rangeStart("today", NOW).toISOString()).toBe("2026-09-19T21:00:00.000Z");
  });

  it("starts the week window six days before Qatar midnight", () => {
    expect(rangeStart("week", NOW).toISOString()).toBe("2026-09-13T21:00:00.000Z");
  });

  it("starts the month window 29 days before Qatar midnight", () => {
    expect(rangeStart("month", NOW).toISOString()).toBe("2026-08-21T21:00:00.000Z");
  });

  it("creates 24 hourly points for today and 7 / 30 daily points otherwise", () => {
    expect(buildDashboardSeries({ range: "today", searches: [], alerts: [], now: NOW }).traffic).toHaveLength(24);
    expect(buildDashboardSeries({ range: "week", searches: [], alerts: [], now: NOW }).traffic).toHaveLength(7);
    expect(buildDashboardSeries({ range: "month", searches: [], alerts: [], now: NOW }).traffic).toHaveLength(30);
  });

  it("labels the last daily bucket with today's Qatar date", () => {
    const { traffic } = buildDashboardSeries({ range: "week", searches: [], alerts: [], now: NOW });
    expect(traffic[traffic.length - 1].key).toBe("2026-09-20");
    expect(traffic[0].key).toBe("2026-09-14");
    expect(traffic[0].labelAr.length).toBeGreaterThan(0);
    expect(traffic[0].labelEn.length).toBeGreaterThan(0);
  });
});

describe("dashboard series — bucketing", () => {
  const searches = [
    // today (Sep 20) at 09:30 Qatar
    { created_at: "2026-09-20T06:30:00Z" },
    { created_at: "2026-09-20T06:45:00Z" },
    // Sep 18 at 14:00 Qatar
    { created_at: "2026-09-18T11:00:00Z" },
    // outside the week window
    { created_at: "2026-01-01T00:00:00Z" },
  ];
  const alerts = [
    { created_at: "2026-09-20T06:00:00Z", resolved_at: "2026-09-20T06:04:00Z", status: "resolved" }, // 4 min → under5
    { created_at: "2026-09-20T07:00:00Z", resolved_at: "2026-09-20T07:10:00Z", status: "resolved" }, // 10 min → mid
    { created_at: "2026-09-20T08:00:00Z", resolved_at: "2026-09-20T08:30:00Z", status: "resolved" }, // 30 min → over15
    { created_at: "2026-09-19T10:00:00Z", status: "pending" },
  ];

  it("counts searches and alerts into the right day buckets and ignores out-of-window rows", () => {
    const { traffic, sampleSize } = buildDashboardSeries({ range: "week", searches, alerts, now: NOW });
    const today = traffic.find((p) => p.key === "2026-09-20")!;
    const sep18 = traffic.find((p) => p.key === "2026-09-18")!;

    expect(today.searches).toBe(2);
    expect(today.alerts).toBe(3);
    expect(today.resolved).toBe(3); // all three were resolved today
    expect(sep18.searches).toBe(1);
    expect(sep18.alerts).toBe(0);
    // 3 searches in window + 4 alerts in window (the January search is dropped)
    expect(sampleSize).toBe(7);
  });

  it("buckets by hour when the range is today", () => {
    const { traffic } = buildDashboardSeries({ range: "today", searches, alerts, now: NOW });
    // 09:30 Qatar → hour 9; the Sep 18 search is outside today's window
    expect(traffic[9].searches).toBe(2);
    expect(traffic[14].searches).toBe(0);
    // 06:00Z / 07:00Z / 08:00Z land on 09:00 / 10:00 / 11:00 Qatar
    expect(traffic[9].alerts).toBe(1);
    expect(traffic[10].alerts).toBe(1);
    expect(traffic[11].alerts).toBe(1);
  });

  it("aggregates peak hours across the whole range", () => {
    const { peakHours } = buildDashboardSeries({ range: "week", searches, alerts, now: NOW });
    expect(peakHours).toHaveLength(24);
    expect(peakHours[9].count).toBe(3); // two searches + one alert at 09:00 Qatar
    expect(peakHours.reduce((sum, p) => sum + p.count, 0)).toBe(7);
  });

  it("computes resolution buckets and the mean resolution time", () => {
    const { resolution } = buildDashboardSeries({ range: "week", searches, alerts, now: NOW });
    expect(resolution.total).toBe(3);
    expect(resolution.under5).toBe(1);
    expect(resolution.mid).toBe(1);
    expect(resolution.over15).toBe(1);
    expect(resolution.averageSeconds).toBe(Math.round((240 + 600 + 1800) / 3));
  });

  it("reports an empty resolution block when nothing was resolved", () => {
    const { resolution } = buildDashboardSeries({
      range: "week",
      searches: [],
      alerts: [{ created_at: "2026-09-20T06:00:00Z", status: "pending" }],
      now: NOW,
    });
    expect(resolution.total).toBe(0);
    expect(resolution.averageSeconds).toBeNull();
  });

  it("ignores inverted or malformed timestamps", () => {
    const { resolution } = buildDashboardSeries({
      range: "week",
      searches: [{ created_at: "not-a-date" }],
      alerts: [{ created_at: "2026-09-20T08:00:00Z", resolved_at: "2026-09-20T07:00:00Z" }],
      now: NOW,
    });
    expect(resolution.total).toBe(0);
  });

  it("flags a truncated series when the row cap is reached", () => {
    const many = Array.from({ length: 5 }, () => ({ created_at: "2026-09-20T06:00:00Z" }));
    expect(buildDashboardSeries({ range: "week", searches: many, alerts: [], now: NOW, rowCap: 5 }).truncated).toBe(true);
    expect(buildDashboardSeries({ range: "week", searches: many, alerts: [], now: NOW, rowCap: 50 }).truncated).toBe(false);
  });
});

describe("dashboard series — formatting", () => {
  it("renders 12-hour clock labels in both languages", () => {
    expect(hourLabel(0, "ar")).toBe("12:00 ص");
    expect(hourLabel(13, "ar")).toBe("1:00 م");
    expect(hourLabel(13, "en")).toBe("1:00 PM");
    expect(hourLabel(12, "en")).toBe("12:00 PM");
  });

  it("computes rounded percentage shares without dividing by zero", () => {
    expect(share(1, 3)).toBe(33.3);
    expect(share(2, 3)).toBe(66.7);
    expect(share(0, 0)).toBe(0);
  });
});
