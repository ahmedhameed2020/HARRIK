/**
 * حَرِّك | HARRIK — executive dashboard series builder.
 *
 * Pure, dependency-free helpers that turn raw `vehicle_search_events` and
 * `parking_alerts` rows into the chart series the dashboard renders. Kept
 * separate from the route so the bucketing can be unit-tested.
 *
 * Everything is bucketed in the organization timezone. Qatar has used a fixed
 * UTC+03:00 offset with no DST since 1972, so a constant offset is exact (and
 * avoids depending on the host's ICU timezone database for the math).
 */

export type DashboardRange = "today" | "week" | "month";

export const RANGES: DashboardRange[] = ["today", "week", "month"];

/** Qatar Standard Time — fixed UTC+03:00, no daylight saving. */
export const QATAR_UTC_OFFSET_MINUTES = 180;

const DAY_MS = 86_400_000;
const OFFSET_MS = QATAR_UTC_OFFSET_MINUTES * 60_000;

export interface SearchEventRow {
  created_at: string;
}

export interface AlertRow {
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  status?: string | null;
}

export interface TrafficPoint {
  /** Stable bucket key (`YYYY-MM-DD` for days, `YYYY-MM-DDTHH` for hours). */
  key: string;
  labelAr: string;
  labelEn: string;
  searches: number;
  alerts: number;
  resolved: number;
}

export interface PeakHourPoint {
  hour: number;
  labelAr: string;
  labelEn: string;
  count: number;
}

export interface ResolutionBuckets {
  /** Incidents closed in under 5 minutes. */
  under5: number;
  /** Incidents closed between 5 and 15 minutes. */
  mid: number;
  /** Incidents closed after 15 minutes. */
  over15: number;
  /** Total resolved incidents behind the distribution (0 → nothing to show). */
  total: number;
  /** Mean resolution time in seconds, or null when nothing was resolved. */
  averageSeconds: number | null;
}

export interface DashboardSeries {
  range: DashboardRange;
  /** Traffic trend: 24 hourly points for `today`, 7 or 30 daily points otherwise. */
  traffic: TrafficPoint[];
  /** Activity per hour of day across the whole range (24 entries, hour 0–23). */
  peakHours: PeakHourPoint[];
  resolution: ResolutionBuckets;
  /** Number of raw rows the series was built from. */
  sampleSize: number;
  /** True when the query hit its row cap, so the series is a lower bound. */
  truncated: boolean;
  generatedAt: string;
}

/** Accepts anything and falls back to the 7-day window. */
export function parseRange(value: string | null | undefined): DashboardRange {
  return RANGES.includes(value as DashboardRange) ? (value as DashboardRange) : "week";
}

interface QatarParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
}

/** Local (Qatar) calendar parts of an instant. */
export function qatarParts(date: Date): QatarParts {
  const shifted = new Date(date.getTime() + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (p: QatarParts) => `${p.year}-${pad(p.month)}-${pad(p.day)}`;
const hourKey = (p: QatarParts) => `${dayKey(p)}T${pad(p.hour)}`;

/** Qatar-local midnight of the day containing `date`, as a real instant. */
function qatarMidnight(date: Date): Date {
  const p = qatarParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - OFFSET_MS);
}

/** First instant included in the range window. */
export function rangeStart(range: DashboardRange, now: Date = new Date()): Date {
  const midnight = qatarMidnight(now);
  if (range === "today") return midnight;
  const days = range === "week" ? 6 : 29;
  return new Date(midnight.getTime() - days * DAY_MS);
}

/** Inclusive list of day buckets the range covers (1 for `today`). */
function dayBuckets(range: DashboardRange, now: Date): { key: string; date: Date }[] {
  // The window ends *now*, so the buckets walk forward from the range start —
  // never from today's midnight (which would look into the future).
  const start = rangeStart(range, now);
  const days = range === "today" ? 1 : range === "week" ? 7 : 30;
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * DAY_MS);
    return { key: dayKey(qatarParts(date)), date };
  });
}

const AR_WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday index in Qatar for a bucket that starts at local midnight. */
function qatarWeekday(date: Date): number {
  return new Date(date.getTime() + OFFSET_MS).getUTCDay();
}

export function hourLabel(hour: number, lang: "ar" | "en" = "ar"): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  if (lang === "ar") return `${h12}:00 ${hour < 12 ? "ص" : "م"}`;
  return `${h12}:00 ${hour < 12 ? "AM" : "PM"}`;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Builds every series the dashboard needs from raw rows.
 *
 * Rows outside the window are ignored, so the caller may over-fetch safely.
 */
export function buildDashboardSeries(input: {
  range: DashboardRange;
  searches: SearchEventRow[];
  alerts: AlertRow[];
  now?: Date;
  /** Row cap the caller used, so the series can report a lower bound. */
  rowCap?: number;
}): DashboardSeries {
  const { range } = input;
  const now = input.now ?? new Date();
  const from = rangeStart(range, now).getTime();
  const to = now.getTime();
  const inWindow = (d: Date | null): d is Date =>
    d !== null && d.getTime() >= from && d.getTime() <= to;

  const days = dayBuckets(range, now);
  const dailyIndex = new Map(days.map((d, i) => [d.key, i]));
  const hourly = range === "today";

  // --- traffic trend -------------------------------------------------------
  const traffic: TrafficPoint[] = hourly
    ? Array.from({ length: 24 }, (_, h) => ({
        key: `${days[0].key}T${pad(h)}`,
        labelAr: hourLabel(h, "ar"),
        labelEn: hourLabel(h, "en"),
        searches: 0,
        alerts: 0,
        resolved: 0,
      }))
    : days.map((d) => {
        const wd = qatarWeekday(d.date);
        return {
          key: d.key,
          labelAr: AR_WEEKDAYS[wd],
          labelEn: EN_WEEKDAYS[wd],
          searches: 0,
          alerts: 0,
          resolved: 0,
        };
      });

  const indexOf = (d: Date): number => {
    const p = qatarParts(d);
    return hourly ? p.hour : (dailyIndex.get(dayKey(p)) ?? -1);
  };

  let sampleSize = 0;
  for (const row of input.searches) {
    const d = toDate(row.created_at);
    if (!inWindow(d)) continue;
    sampleSize++;
    const i = indexOf(d);
    if (i >= 0) traffic[i].searches++;
  }
  for (const row of input.alerts) {
    const created = toDate(row.created_at);
    if (!inWindow(created)) continue;
    sampleSize++;
    const i = indexOf(created);
    if (i >= 0) traffic[i].alerts++;
    const resolved = toDate(row.resolved_at);
    if (inWindow(resolved)) {
      const j = indexOf(resolved);
      if (j >= 0) traffic[j].resolved++;
    }
  }

  // --- peak hours (activity per hour of day across the range) --------------
  const peakHours: PeakHourPoint[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    labelAr: hourLabel(h, "ar"),
    labelEn: hourLabel(h, "en"),
    count: 0,
  }));
  for (const row of input.searches) {
    const d = toDate(row.created_at);
    if (inWindow(d)) peakHours[qatarParts(d).hour].count++;
  }
  for (const row of input.alerts) {
    const d = toDate(row.created_at);
    if (inWindow(d)) peakHours[qatarParts(d).hour].count++;
  }

  // --- resolution speed ----------------------------------------------------
  const resolution: ResolutionBuckets = {
    under5: 0,
    mid: 0,
    over15: 0,
    total: 0,
    averageSeconds: null,
  };
  let durationSum = 0;
  for (const row of input.alerts) {
    const created = toDate(row.created_at);
    const resolved = toDate(row.resolved_at);
    if (!created || !resolved || resolved.getTime() < created.getTime()) continue;
    const seconds = (resolved.getTime() - created.getTime()) / 1000;
    durationSum += seconds;
    resolution.total++;
    if (seconds < 300) resolution.under5++;
    else if (seconds < 900) resolution.mid++;
    else resolution.over15++;
  }
  if (resolution.total > 0) {
    resolution.averageSeconds = Math.round(durationSum / resolution.total);
  }

  return {
    range,
    traffic,
    peakHours,
    resolution,
    sampleSize,
    truncated:
      input.rowCap !== undefined &&
      (input.searches.length >= input.rowCap || input.alerts.length >= input.rowCap),
    generatedAt: now.toISOString(),
  };
}

/** Percentage share of a bucket, rounded to one decimal (0 when nothing to show). */
export function share(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}
