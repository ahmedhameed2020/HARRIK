/**
 * حَرِّك | HARRIK — Timed escalation for unacknowledged parking alerts.
 *
 * An alert that stays `pending` past the threshold is pushed to the facility's
 * security & administrators, and marked with `escalated_at` so it is escalated
 * exactly once. Designed to be invoked lazily on read (inbox / dashboard) or by
 * an external scheduler (see POST /api/alerts/escalate) — no cron dependency.
 *
 * Degrades safely: if the `escalated_at` column is not present yet (migration
 * pending) the query fails and the helper reports `unavailable`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { notifySecurityTeam } from "./alert-dispatch";

export const DEFAULT_ESCALATION_THRESHOLD_SECONDS = 90;

export interface EscalateStaleResult {
  checked: number;
  escalated: number;
  unavailable?: boolean;
}

export async function escalateStaleAlerts(
  supabase: SupabaseClient,
  options: {
    organizationId?: string;
    thresholdSeconds?: number;
    limit?: number;
  } = {}
): Promise<EscalateStaleResult> {
  const threshold = options.thresholdSeconds ?? DEFAULT_ESCALATION_THRESHOLD_SECONDS;
  const max = options.limit ?? 20;

  try {
    const cutoff = new Date(Date.now() - threshold * 1000).toISOString();

    let query = supabase
      .from("parking_alerts")
      .select(
        "id, organization_id, owner_id, created_at, escalated_at, vehicle:vehicles(plate_number)"
      )
      .eq("status", "pending")
      .is("escalated_at", null)
      .lte("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(max);

    if (options.organizationId) {
      query = query.eq("organization_id", options.organizationId);
    }

    const { data, error } = await query;
    if (error) return { checked: 0, escalated: 0, unavailable: true };

    let escalated = 0;
    for (const row of (data || []) as any[]) {
      const plate = row?.vehicle?.plate_number || "";

      await notifySecurityTeam(supabase, {
        organizationId: row.organization_id,
        ownerId: row.owner_id,
        plateDisplay: plate,
        alertId: row.id,
        // Wording is resolved per recipient, in their own language.
        escalation: { kind: "no_response", plate, thresholdSeconds: threshold },
      });

      try {
        await supabase
          .from("parking_alerts")
          .update({ escalated_at: new Date().toISOString() })
          .eq("id", row.id);
      } catch {
        // If the marker cannot be written we may re-notify; acceptable for V1.
      }

      escalated++;
    }

    return { checked: (data || []).length, escalated };
  } catch {
    return { checked: 0, escalated: 0, unavailable: true };
  }
}
