import { NextRequest, NextResponse } from "next/server";
import { validatePlateQuery } from "@/lib/plate-normalizer";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import {
  getOrgSettings,
  applyPrivacyMask,
  type OrgSettings,
} from "@/lib/org-settings";
import { SEED_VEHICLES, FIXTURES_ENABLED } from "@/lib/test-fixtures";
import type { PrivacyMode, SearchResultVehicle } from "@/types";

function contactVisibilityFor(mode: PrivacyMode): "full" | "alert_only" | "anonymous" {
  if (mode === "mode_a") return "full";
  if (mode === "mode_b") return "alert_only";
  return "anonymous";
}

/** Attaches the effective privacy mode + masks PII before returning to client. */
function decorate(
  row: SearchResultVehicle,
  settings: OrgSettings,
  matchType?: SearchResultVehicle["match_type"]
): SearchResultVehicle {
  return {
    ...applyPrivacyMask(row, settings.privacy_mode),
    ...(matchType ? { match_type: matchType } : {}),
    privacy_mode: settings.privacy_mode,
    contact_visibility: contactVisibilityFor(settings.privacy_mode),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") || "";
    const orgId = session.organizationId; // Derived strictly from verified session!

    const supabase = await createClient();
    const settings = await getOrgSettings(supabase, orgId);

    // Enforce the tenant-configured minimum digits (defaults to 3).
    const validation = validatePlateQuery(rawQuery, settings.min_partial_digits);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        results: [],
      });
    }

    const normQuery = validation.normalized;

    // 1. Authoritative lookup via Supabase RPC.
    // NOTE: find_vehicle_by_plate(p_query TEXT) derives the organization from the
    // verified session (current_user_org_id()) — it takes NO p_org_id argument.
    let rpcFailed = false;
    try {
      const { data, error } = await supabase.rpc("find_vehicle_by_plate", {
        p_query: normQuery,
      });

      if (error) {
        rpcFailed = true;
      } else {
        const rows = (Array.isArray(data) ? data : []) as SearchResultVehicle[];
        // Exact match takes priority
        const exactRows = rows.filter((r) => (r.match_type || "exact") === "exact");
        const partialRows = rows.filter((r) => r.match_type === "partial");

        const usable = settings.partial_search_enabled
          ? exactRows.length > 0
            ? exactRows
            : normQuery.length >= settings.min_partial_digits
            ? partialRows
            : []
          : exactRows;

        if (usable.length > 0) {
          return NextResponse.json({
            success: true,
            normalizedQuery: normQuery,
            results: usable.map((r) => decorate(r, settings, r.match_type || "exact")),
          });
        }
      }
    } catch {
      rpcFailed = true;
    }

    // Production never masks a database failure with fake data.
    if (rpcFailed && !FIXTURES_ENABLED) {
      return NextResponse.json(
        { success: false, error: "Search service temporarily unavailable", results: [] },
        { status: 503 }
      );
    }

    // 2. Local seed matcher (non-production only) mirroring the RPC algorithm
    if (FIXTURES_ENABLED) {
      const exactMatches = SEED_VEHICLES.filter((v) => v.normalized_plate === normQuery);
      if (exactMatches.length > 0) {
        return NextResponse.json({
          success: true,
          normalizedQuery: normQuery,
          results: exactMatches.map((v) => decorate(v, settings, "exact")),
        });
      }

      if (settings.partial_search_enabled && normQuery.length >= settings.min_partial_digits) {
        const partialMatches = SEED_VEHICLES.filter((v) =>
          v.normalized_plate.endsWith(normQuery)
        );
        if (partialMatches.length > 0) {
          return NextResponse.json({
            success: true,
            normalizedQuery: normQuery,
            results: partialMatches.map((v) => decorate(v, settings, "partial")),
          });
        }
      }
    }

    // 3. Active Visitor Passes for this plate
    try {
      const { data: visitorPasses } = await supabase
        .from("visitor_passes")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .gt("valid_until", new Date().toISOString())
        .or(`normalized_plate.eq.${normQuery},normalized_plate.ilike.%${normQuery}`);

      if (visitorPasses && visitorPasses.length > 0) {
        const mappedVisitors: SearchResultVehicle[] = visitorPasses.map((vp: any) => ({
          vehicle_id: vp.id,
          plate_number: vp.plate_number,
          normalized_plate: vp.normalized_plate,
          make: vp.vehicle_make || "سيارة زائر",
          model: vp.vehicle_model || "مؤقت",
          color: vp.vehicle_color || "غير محدد",
          is_primary: true,
          owner_id: vp.host_profile_id || null,
          owner_name_ar: `[زائر مُصرّح] ${vp.visitor_name}`,
          owner_name_en: `[Visitor] ${vp.visitor_name}`,
          owner_employee_id: "VISITOR",
          owner_mobile: vp.visitor_mobile,
          department_name_ar: vp.host_name ? `المستضيف: ${vp.host_name}` : "تصريح زائر مؤقت",
          department_name_en: vp.host_name ? `Host: ${vp.host_name}` : "Temporary Visitor",
          match_type: vp.normalized_plate === normQuery ? "exact" : "partial",
        }));

        return NextResponse.json({
          success: true,
          normalizedQuery: normQuery,
          results: mappedVisitors.map((m) => decorate(m, settings)),
        });
      }
    } catch (err) {
      console.warn("Visitor search error:", err);
    }

    // 4. No match — return escalation details for unregistered vehicles
    const escalation = {
      venueLabel: settings.branding.venue_label || "المنشأة",
      venueNameAr: "المنشأة",
      gateSecurityPhone: settings.branding.gate_security_phone || "+974 4400 0000",
    };

    try {
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("name_ar, name_en")
        .eq("id", orgId)
        .maybeSingle();
      if (orgRow?.name_ar) escalation.venueNameAr = orgRow.name_ar;
    } catch {
      // Keep sensible fallback defaults
    }

    return NextResponse.json({
      success: true,
      normalizedQuery: normQuery,
      results: [],
      escalation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
