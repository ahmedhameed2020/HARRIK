/**
 * حَرِّك | HARRIK — the configured operating window, applied to the analytics.
 *
 * The settings panel has always offered "ساعات العمل وأوقات الذروة" and told the
 * administrator, in as many words, that these times "help tune peak analytics
 * and the charts". They did nothing: the value was written to
 * `branding.operating_hours` and read back only by the settings screen itself.
 *
 * The consequence was not cosmetic. "Peak" was the busiest hour across the
 * whole 24, so a handful of overnight events could be reported as a school's
 * peak parking hour — a number an administrator might staff against.
 *
 * These helpers are pure so the window logic, including the overnight case,
 * can be tested without a database or a chart.
 */

export interface OperatingHours {
  /** "HH:MM" — inclusive. */
  start?: string;
  /** "HH:MM" — exclusive, and may be *before* `start` for an overnight shift. */
  end?: string;
  /** Advisory marker the administrator set; not used to compute the peak. */
  peak?: string;
}

/** "07:00" → 7. Returns null for anything unparseable, so callers can fall back. */
export function parseHour(value?: string | null): number | null {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

/**
 * Is this hour of the day inside the configured window?
 *
 * An unset or unparseable window means "no opinion" — every hour counts, which
 * is exactly the behaviour before this existed, so a tenant that never touched
 * the setting sees no change.
 */
export function isWithinOperatingHours(hour: number, operating?: OperatingHours | null): boolean {
  const start = parseHour(operating?.start);
  const end = parseHour(operating?.end);
  if (start === null || end === null) return true;
  // A window that starts and ends on the same hour is treated as "all day"
  // rather than as a single hour, which is the safer reading of 00:00–00:00.
  if (start === end) return true;
  // Overnight windows (22:00 → 06:00) wrap past midnight.
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/**
 * The busiest hour *within* the operating window.
 *
 * Falls back to the busiest hour overall when nothing happened inside the
 * window, so a facility with activity only out of hours still sees a peak
 * rather than an empty label.
 */
export function pickPeakHour<T extends { hour: number; count: number }>(
  points: T[],
  operating?: OperatingHours | null
): T | undefined {
  if (!points.length) return undefined;

  const busiest = (candidates: T[]) =>
    candidates.reduce<T | undefined>(
      (best, point) => (best === undefined || point.count > best.count ? point : best),
      undefined
    );

  const inHours = points.filter((p) => isWithinOperatingHours(p.hour, operating));
  const withinPeak = busiest(inHours);
  if (withinPeak && withinPeak.count > 0) return withinPeak;

  return busiest(points);
}

/**
 * The hours of the day to chart, in order, for the configured window.
 *
 * Used by the printable report, whose hourly distribution was hardcoded to
 * 06:00–17:00 — a site working an evening or overnight shift printed an empty
 * peak chart. An unset window keeps that original 06:00–17:00 span, so nothing
 * changes for a tenant that never configured one.
 */
export function operatingHourRange(operating?: OperatingHours | null): number[] {
  const start = parseHour(operating?.start);
  const end = parseHour(operating?.end);

  if (start === null || end === null || start === end) {
    return Array.from({ length: 12 }, (_, i) => 6 + i);
  }

  const hours: number[] = [];
  for (let h = start; ; h = (h + 1) % 24) {
    hours.push(h);
    if (h === (end + 23) % 24) break; // stop at the last hour before `end`
    if (hours.length >= 24) break; // safety net; a window can never exceed a day
  }
  return hours;
}
