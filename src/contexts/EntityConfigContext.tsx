"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EntityPreset, getEntityPreset, formatWhatsappMessage } from "@/lib/entity-config";

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

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.settings?.branding) {
          if (json.settings.branding.entity_type) {
            setEntityType(json.settings.branding.entity_type);
          }
          if (json.settings.branding.custom_whatsapp_template) {
            setCustomTemplate(json.settings.branding.custom_whatsapp_template);
          }
        }
      }
    } catch {
      // Fallback silently if settings endpoint not accessible
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
      formatWhatsapp,
      refreshEntityConfig: fetchSettings,
      config: fields,
    };
  }, [preset, venueName, formatWhatsapp, fetchSettings]);

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
      formatWhatsapp: (plate: string) =>
        formatWhatsappMessage(fallbackPreset.defaultWhatsappTemplate, { plate, venue_name: "المنشأة" }),
      refreshEntityConfig: async () => {},
      config: fallbackFields,
    };
  }
  return context;
}
