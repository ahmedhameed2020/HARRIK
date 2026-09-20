"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EntityPreset, getEntityPreset, formatWhatsappMessage } from "@/lib/entity-config";
import type { PrivacyMode } from "@/types";

export interface ClientOrgSettings {
  privacy_mode: PrivacyMode;
  partial_search_enabled: boolean;
  min_partial_digits: number;
  whatsapp_enabled: boolean;
  country_calling_code: string;
  default_language: "ar" | "en";
  branding: {
    entity_type?: string;
    venue_label?: string;
    primary_color?: string;
    custom_whatsapp_template?: string;
    operating_hours?: { start?: string; end?: string; peak?: string };
    gate_security_phone?: string;
  };
}

export interface ClientAlertType {
  id?: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon?: string | null;
  sort_order?: number;
}

const DEFAULT_CLIENT_SETTINGS: ClientOrgSettings = {
  privacy_mode: "mode_a",
  partial_search_enabled: true,
  min_partial_digits: 3,
  whatsapp_enabled: true,
  country_calling_code: "+974",
  default_language: "ar",
  branding: {},
};

interface EntityConfigContextValue {
  preset: EntityPreset;
  venueName: string;
  venueLabel: string;
  venueLabelEn: string;
  memberLabel: string;
  memberLabelEn: string;
  memberSingle: string;
  memberSingleEn: string;
  directoryLabel: string;
  directoryLabelEn: string;
  unitLabel: string;
  unitLabelEn: string;
  unitLabelPlural: string;
  unitLabelPluralEn: string;
  identifierLabel: string;
  identifierLabelEn: string;
  visitorLabel: string;
  visitorLabelEn: string;
  securityLabel: string;
  securityLabelEn: string;
  facilityLabel: string;
  facilityLabelEn: string;
  emptyState: string;
  emptyStateEn: string;
  /** Effective tenant operating settings (privacy, search, contact). */
  settings: ClientOrgSettings;
  privacyMode: PrivacyMode;
  alertTypes: ClientAlertType[];
  formatWhatsapp: (plate: string, customTemplate?: string) => string;
  refreshEntityConfig: () => Promise<void>;
  config: {
    preset: EntityPreset;
    venueName: string;
    venueLabel: string;
    venueLabelEn: string;
    memberLabel: string;
    memberLabelEn: string;
    memberSingle: string;
    memberSingleEn: string;
    directoryLabel: string;
    directoryLabelEn: string;
    unitLabel: string;
    unitLabelEn: string;
    unitLabelPlural: string;
    unitLabelPluralEn: string;
    identifierLabel: string;
    identifierLabelEn: string;
    visitorLabel: string;
    visitorLabelEn: string;
    securityLabel: string;
    securityLabelEn: string;
    facilityLabel: string;
    facilityLabelEn: string;
    emptyState: string;
    emptyStateEn: string;
  };
}

const EntityConfigContext = createContext<EntityConfigContextValue | null>(null);

export function EntityConfigProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [entityType, setEntityType] = useState<string>((profile?.organization as any)?.entity_type || "other");
  const [customTemplate, setCustomTemplate] = useState<string | null>(null);
  const [settings, setSettings] = useState<ClientOrgSettings>(DEFAULT_CLIENT_SETTINGS);
  const [alertTypes, setAlertTypes] = useState<ClientAlertType[]>([]);

  const fetchSettings = useCallback(async () => {
    try {
      // Member-readable endpoint (available to all roles, unlike /api/admin/settings).
      const res = await fetch("/api/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.settings) {
            const s = json.settings as ClientOrgSettings;
            setSettings({ ...DEFAULT_CLIENT_SETTINGS, ...s, branding: { ...s.branding } });
            if (s.branding?.entity_type) setEntityType(s.branding.entity_type);
            if (s.branding?.custom_whatsapp_template) {
              setCustomTemplate(s.branding.custom_whatsapp_template);
            }
          }
          if (Array.isArray(json.alertTypes) && json.alertTypes.length > 0) {
            setAlertTypes(json.alertTypes);
          }
        }
      }
    } catch {
      // Fallback silently if settings endpoint not accessible
    }
  }, []);

  // Tenant settings are member-scoped: wait until there is a profile, otherwise
  // the public/auth pages (e.g. `/login`) would fire an unauthorized request.
  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    fetchSettings();
  }, [fetchSettings, profileId]);

  const preset = useMemo(() => {
    return getEntityPreset(entityType);
  }, [entityType]);

  const venueName = useMemo(() => {
    return profile?.organization?.name_ar || profile?.organization?.name_en || "المنشأة";
  }, [profile?.organization?.name_ar, profile?.organization?.name_en]);

  const formatWhatsapp = useCallback(
    (plate: string, overrideTemplate?: string) => {
      const tmpl = overrideTemplate || customTemplate || preset.defaultWhatsappTemplate;
      return formatWhatsappMessage(tmpl, { plate, venue_name: venueName });
    },
    [customTemplate, preset.defaultWhatsappTemplate, venueName]
  );

  const value = useMemo<EntityConfigContextValue>(() => {
    const fields = {
      preset,
      venueName,
      venueLabel: preset.venueLabelAr,
      venueLabelEn: preset.venueLabelEn,
      memberLabel: preset.memberLabelAr,
      memberLabelEn: preset.memberLabelEn,
      memberSingle: preset.memberSingleAr,
      memberSingleEn: preset.memberSingleEn,
      directoryLabel: preset.directoryLabelAr,
      directoryLabelEn: preset.directoryLabelEn,
      unitLabel: preset.unitLabelAr,
      unitLabelEn: preset.unitLabelEn,
      unitLabelPlural: preset.unitLabelPluralAr,
      unitLabelPluralEn: preset.unitLabelPluralEn,
      identifierLabel: preset.identifierLabelAr,
      identifierLabelEn: preset.identifierLabelEn,
      visitorLabel: preset.visitorLabelAr,
      visitorLabelEn: preset.visitorLabelEn,
      securityLabel: preset.securityLabelAr,
      securityLabelEn: preset.securityLabelEn,
      facilityLabel: preset.facilityLabelAr,
      facilityLabelEn: preset.facilityLabelEn,
      emptyState: preset.emptyStateAr,
      emptyStateEn: preset.emptyStateEn,
    };

    return {
      ...fields,
      settings,
      privacyMode: settings.privacy_mode,
      alertTypes,
      formatWhatsapp,
      refreshEntityConfig: fetchSettings,
      config: fields,
    };
  }, [preset, venueName, settings, alertTypes, formatWhatsapp, fetchSettings]);

  return (
    <EntityConfigContext.Provider value={value}>
      {children}
    </EntityConfigContext.Provider>
  );
}

export function useEntityConfig(): EntityConfigContextValue {
  const context = useContext(EntityConfigContext);
  if (!context) {
    // Graceful fallback if called outside provider - strictly defaults to 'other' (Authorized Members)
    const fallbackPreset = getEntityPreset("other");
    const fallbackFields = {
      preset: fallbackPreset,
      venueName: "المنشأة",
      venueLabel: fallbackPreset.venueLabelAr,
      venueLabelEn: fallbackPreset.venueLabelEn,
      memberLabel: fallbackPreset.memberLabelAr,
      memberLabelEn: fallbackPreset.memberLabelEn,
      memberSingle: fallbackPreset.memberSingleAr,
      memberSingleEn: fallbackPreset.memberSingleEn,
      directoryLabel: fallbackPreset.directoryLabelAr,
      directoryLabelEn: fallbackPreset.directoryLabelEn,
      unitLabel: fallbackPreset.unitLabelAr,
      unitLabelEn: fallbackPreset.unitLabelEn,
      unitLabelPlural: fallbackPreset.unitLabelPluralAr,
      unitLabelPluralEn: fallbackPreset.unitLabelPluralEn,
      identifierLabel: fallbackPreset.identifierLabelAr,
      identifierLabelEn: fallbackPreset.identifierLabelEn,
      visitorLabel: fallbackPreset.visitorLabelAr,
      visitorLabelEn: fallbackPreset.visitorLabelEn,
      securityLabel: fallbackPreset.securityLabelAr,
      securityLabelEn: fallbackPreset.securityLabelEn,
      facilityLabel: fallbackPreset.facilityLabelAr,
      facilityLabelEn: fallbackPreset.facilityLabelEn,
      emptyState: fallbackPreset.emptyStateAr,
      emptyStateEn: fallbackPreset.emptyStateEn,
    };

    return {
      ...fallbackFields,
      settings: DEFAULT_CLIENT_SETTINGS,
      privacyMode: "mode_a" as PrivacyMode,
      alertTypes: [],
      formatWhatsapp: (plate: string) =>
        formatWhatsappMessage(fallbackPreset.defaultWhatsappTemplate, { plate, venue_name: "المنشأة" }),
      refreshEntityConfig: async () => {},
      config: fallbackFields,
    };
  }
  return context;
}
