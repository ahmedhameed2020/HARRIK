/**
 * حَرِّك | HARRIK — Organization Settings Resolver (Server)
 *
 * Single source of truth for reading a tenant's effective operating settings.
 * Used by API routes so that admin-configured values are actually enforced
 * (privacy mode, partial search, WhatsApp template, alert behaviour, ...).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrivacyMode } from "@/types";

export interface OrgBranding {
  entity_type?: string;
  venue_label?: string;
  primary_color?: string;
  custom_whatsapp_template?: string;
  operating_hours?: { start?: string; end?: string; peak?: string };
  gate_security_phone?: string;
}

export interface OrgSettings {
  privacy_mode: PrivacyMode;
  partial_search_enabled: boolean;
  min_partial_digits: number;
  whatsapp_enabled: boolean;
  country_calling_code: string;
  default_language: "ar" | "en";
  branding: OrgBranding;
}

export const DEFAULT_ORG_BRANDING: OrgBranding = {
  entity_type: "other",
  venue_label: "المنشأة",
  primary_color: "#8A1538",
  custom_whatsapp_template:
    "السلام عليكم، سيارتك رقم {plate} متوقفة أمام سيارتي وتغلق المسار في مواقف {venue_name}. يرجى التكرم بتحريكها شاكراً لتعاونكم.",
  operating_hours: { start: "07:00", end: "16:00", peak: "13:00" },
  gate_security_phone: "+974 4400 0000",
};

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  privacy_mode: "mode_a",
  partial_search_enabled: true,
  min_partial_digits: 3,
  whatsapp_enabled: true,
  country_calling_code: "+974",
  default_language: "ar",
  branding: DEFAULT_ORG_BRANDING,
};

const PRIVACY_MODES: PrivacyMode[] = ["mode_a", "mode_b", "mode_c"];

/**
 * Reads the effective settings for an organization, applying safe defaults when
 * no row exists yet. Never throws — always returns a usable settings object.
 */
export async function getOrgSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgSettings> {
  if (!organizationId) return DEFAULT_ORG_SETTINGS;

  try {
    const { data } = await supabase
      .from("system_settings")
      .select(
        "privacy_mode, partial_search_enabled, min_partial_digits, whatsapp_enabled, country_calling_code, default_language, branding"
      )
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!data) return DEFAULT_ORG_SETTINGS;

    const raw = data as Record<string, any>;
    const privacy = PRIVACY_MODES.includes(raw.privacy_mode) ? raw.privacy_mode : "mode_a";
    const digits = Number(raw.min_partial_digits);

    return {
      privacy_mode: privacy,
      partial_search_enabled: raw.partial_search_enabled !== false,
      min_partial_digits: digits >= 2 && digits <= 6 ? digits : 3,
      whatsapp_enabled: raw.whatsapp_enabled !== false,
      country_calling_code: raw.country_calling_code || "+974",
      default_language: raw.default_language === "en" ? "en" : "ar",
      branding: { ...DEFAULT_ORG_BRANDING, ...(raw.branding || {}) },
    };
  } catch {
    return DEFAULT_ORG_SETTINGS;
  }
}

/**
 * Server-side privacy masking for a search result row.
 * Hidden fields are removed entirely (never sent to the client).
 *
 * - mode_a: full identity + direct contact.
 * - mode_b: name & department visible, phone hidden (alert-only contact).
 * - mode_c: anonymous — name/employee/phone hidden, department only.
 */
export function applyPrivacyMask<
  T extends {
    owner_name_ar?: string | null;
    owner_name_en?: string | null;
    owner_employee_id?: string | null;
    owner_mobile?: string | null;
    department_name_ar?: string | null;
    department_name_en?: string | null;
  }
>(row: T, mode: PrivacyMode): T {
  if (mode === "mode_a") return row;

  if (mode === "mode_b") {
    return { ...row, owner_mobile: null };
  }

  // mode_c — anonymous: keep only the department as context.
  return {
    ...row,
    owner_name_ar: null,
    owner_name_en: null,
    owner_employee_id: null,
    owner_mobile: null,
  };
}
