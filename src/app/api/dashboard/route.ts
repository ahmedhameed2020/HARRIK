import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { escalateStaleAlerts } from "@/lib/notifications/escalate-stale";
import { DashboardOverview } from "@/types";
import {
  buildDashboardSeries,
  parseRange,
  rangeStart,
  type AlertRow,
  type SearchEventRow,
} from "@/lib/analytics/dashboard-series";

/** Row cap per event table — keeps the response bounded for large tenants. */
const ROW_CAP = 20_000;

/**
 * Metrics that could not be computed. Values stay `null` so the UI can show
 * "—" instead of a number: the dashboard must never invent analytics.
 */
function unavailableOverview(organizationId: string): DashboardOverview {
  const metric = (key: string, unit: "count" | "percentage" | "seconds") => ({
    key,
    value: null,
    unit,
    status: "unavailable" as const,
  });

  return {
    schemaVersion: 1,
    organizationId,
    timezone: "Asia/Qatar",
    metrics: {
      registeredStaff: metric("registered_staff", "count"),
      registeredVehicles: metric("registered_vehicles", "count"),
      vehicleCoverage: metric("vehicle_coverage", "percentage"),
      searches: metric("searches", "count"),
      successfulSearches: metric("successful_searches", "count"),
      searchSuccessRate: metric("search_success_rate", "percentage"),
      alertsCreated: metric("alerts_created", "count"),
      activeIncidents: metric("active_incidents", "count"),
      pendingAlerts: metric("pending_alerts", "count"),
      acknowledgedAlerts: metric("acknowledged_alerts", "count"),
      resolvedAlerts: metric("resolved_alerts", "count"),
      resolutionRate: metric("resolution_rate", "percentage"),
      averageAcknowledgementTime: metric("avg_ack_time", "seconds"),
      averageResolutionTime: metric("avg_res_time", "seconds"),
      resolvedWithinFiveMinutes: metric("resolved_within_5m", "percentage"),
      openUnknownVehicles: metric("open_unknown", "count"),
    },
    currentIssues: {
      pending: 0,
      acknowledged: 0,
      activeTotal: 0,
      openUnknownVehicles: 0,
      oldestActiveIncident: null,
    },
  };
}

export async function GET(request: Request) {
  try {
    const range = parseRange(new URL(request.url).searchParams.get("range"));
    const from = rangeStart(range).toISOString();
    const to = new Date().toISOString();
    const supabase = await createClient();

    const { session } = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = session.organizationId;

    // Timed escalation for unacknowledged alerts (best-effort, bounded).
    try {
      await escalateStaleAlerts(supabase, { organizationId: orgId });
    } catch {
      // Never block the dashboard on escalation problems.
    }

    // --- chart series: always computed from real rows ----------------------
    let series;
    try {
      const [searches, alerts] = await Promise.all([
        supabase
          .from("vehicle_search_events")
          .select("created_at")
          .eq("organization_id", orgId)
          .gte("created_at", from)
          .lte("created_at", to)
          .limit(ROW_CAP),
        supabase
          .from("parking_alerts")
          .select("created_at, acknowledged_at, resolved_at, status")
          .eq("organization_id", orgId)
          .gte("created_at", from)
          .lte("created_at", to)
          .limit(ROW_CAP),
      ]);

      series = buildDashboardSeries({
        range,
        searches: (searches.data ?? []) as SearchEventRow[],
        alerts: (alerts.data ?? []) as AlertRow[],
        rowCap: ROW_CAP,
      });
    } catch {
      series = buildDashboardSeries({ range, searches: [], alerts: [] });
    }

    // --- KPI block: real metrics from the RPC, or explicit "unavailable" ---
    try {
      const { data, error } = await supabase.rpc("get_dashboard_overview", {
        p_range_start: from,
        p_range_end: to,
        p_timezone: "Asia/Qatar",
      });

      if (!error && data) {
        return NextResponse.json({ ...(data as object), series });
      }
    } catch {
      // Falls through to the unavailable overview.
    }

    return NextResponse.json({ ...unavailableOverview(orgId), series });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
