/**
 * حَرِّك | HARRIK — data retention.
 *
 * `system_settings.retention_days` has existed since the initial schema with a
 * 90-day default, and nothing ever read it: no purge, no UI, no job. The two
 * highest-volume tables in the product are also its most privacy-sensitive —
 * every plate lookup and every "who contacted whom" event — and they grew
 * without bound.
 *
 * WHAT IS PURGED, AND WHAT DELIBERATELY IS NOT
 * --------------------------------------------
 * Purged once older than the tenant's retention window:
 *   - `vehicle_search_events`  — who looked up which plate, and when.
 *   - `contact_action_events`  — who called or messaged whom.
 *
 * Kept regardless:
 *   - `audit_logs`      — the compliance trail of who changed what. Erasing it
 *                         on a timer would also erase the record of the purges
 *                         themselves; expiring it is a decision for whoever
 *                         owns the organisation's compliance policy, not a
 *                         side effect of a cleanup job.
 *   - `parking_alerts`  — incident history that the operations report and the
 *                         dashboard are computed from.
 *   - anything describing a person or a vehicle (profiles, vehicles, permits):
 *                         these are records, not logs, and are removed through
 *                         the screens that own them.
 *
 * Every delete is scoped to one organization at a time, so a tenant's window
 * never reaches another tenant's rows.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Tables this job is allowed to expire, in the order they are processed. */
export const PURGEABLE_EVENT_TABLES = ["vehicle_search_events", "contact_action_events"] as const;

export type PurgeableTable = (typeof PURGEABLE_EVENT_TABLES)[number];

export const MIN_RETENTION_DAYS = 7;
export const MAX_RETENTION_DAYS = 3650;
export const DEFAULT_RETENTION_DAYS = 90;

export interface OrganizationPurgeResult {
  organizationId: string;
  retentionDays: number;
  cutoff: string;
  deleted: Partial<Record<PurgeableTable, number>>;
  errors: string[];
}

export interface PurgeResult {
  organizations: OrganizationPurgeResult[];
  totalDeleted: number;
}

/**
 * Clamps a stored value into the supported range. A misconfigured `0` must not
 * be read as "delete everything"; anything outside the range falls back to the
 * schema default.
 */
export function normaliseRetentionDays(value: unknown): number {
  // `Number(null)` and `Number("")` are 0, which would otherwise be clamped to
  // the 7-day minimum — silently shrinking a 90-day window and deleting eleven
  // weeks of logs because a column was empty. Absence means "use the default",
  // not "keep almost nothing".
  if (value === null || value === undefined || value === "") return DEFAULT_RETENTION_DAYS;
  const days = Number(value);
  if (!Number.isFinite(days)) return DEFAULT_RETENTION_DAYS;
  if (days < MIN_RETENTION_DAYS) return MIN_RETENTION_DAYS;
  if (days > MAX_RETENTION_DAYS) return MAX_RETENTION_DAYS;
  return Math.floor(days);
}

/** The timestamp before which rows are considered expired. */
export function cutoffFor(retentionDays: number, now: Date = new Date()): string {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

async function purgeOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  retentionDays: number,
  now: Date
): Promise<OrganizationPurgeResult> {
  const cutoff = cutoffFor(retentionDays, now);
  const result: OrganizationPurgeResult = {
    organizationId,
    retentionDays,
    cutoff,
    deleted: {},
    errors: [],
  };

  for (const table of PURGEABLE_EVENT_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq("organization_id", organizationId)
        .lt("created_at", cutoff)
        .select("id");

      if (error) {
        result.errors.push(`${table}: ${error.message}`);
        continue;
      }
      result.deleted[table] = (data || []).length;
    } catch (err: any) {
      result.errors.push(`${table}: ${err?.message || "unknown error"}`);
    }
  }

  return result;
}

/**
 * Applies each organization's retention window to the event logs.
 *
 * Best-effort per table and per organization: one tenant's failure never stops
 * the rest, and the caller gets a per-table count so the job can be audited.
 */
export async function purgeExpiredEventLogs(
  supabase: SupabaseClient,
  options: { organizationId?: string; now?: Date } = {}
): Promise<PurgeResult> {
  const now = options.now ?? new Date();
  const result: PurgeResult = { organizations: [], totalDeleted: 0 };

  let query = supabase.from("system_settings").select("organization_id, retention_days");
  if (options.organizationId) {
    query = query.eq("organization_id", options.organizationId);
  }

  const { data: settings, error } = await query;
  if (error || !settings) return result;

  for (const row of settings as Array<{ organization_id: string; retention_days: unknown }>) {
    if (!row.organization_id) continue;
    const orgResult = await purgeOrganization(
      supabase,
      row.organization_id,
      normaliseRetentionDays(row.retention_days),
      now
    );
    result.organizations.push(orgResult);
    result.totalDeleted += Object.values(orgResult.deleted).reduce((a, b) => a + (b || 0), 0);
  }

  return result;
}
