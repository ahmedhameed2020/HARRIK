"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ParkingAlert } from "@/types";
import {
  playAlertChime,
  triggerHapticNotification,
  showBrowserNotification,
} from "@/lib/notifications";

interface UseRealtimeAlertsOptions {
  organizationId?: string;
  onAlertInserted?: (alert: ParkingAlert) => void;
  onAlertUpdated?: (alert: ParkingAlert) => void;
  onAnyChange?: () => void;
  enableNotifications?: boolean;
  /**
   * Skip the count query and the realtime subscription entirely. Used on the
   * public/auth pages (e.g. `/login`) so an anonymous visitor never issues an
   * unauthorized `parking_alerts` request — one less console error and one
   * less pointless round-trip.
   */
  enabled?: boolean;
}

export function useRealtimeAlerts(options: UseRealtimeAlertsOptions = {}) {
  const { organizationId, enableNotifications = true, enabled = true } = options;

  const [activeCount, setActiveCount] = useState<number>(0);
  const supabaseRef = useRef(createClient());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Generate a strictly unique channel ID per subscription instance to avoid Supabase channel collision
  const channelNameRef = useRef(
    `parking_alerts_${Math.random().toString(36).slice(2, 10)}`
  );

  // Function to query active count
  const fetchActiveCount = async () => {
    try {
      const supabase = supabaseRef.current;
      let query = supabase
        .from("parking_alerts")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "acknowledged"]);

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { count, error } = await query;
      if (!error && count !== null) {
        setActiveCount(count);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (!enabled) return;

    fetchActiveCount();

    const supabase = supabaseRef.current;
    const channelName = channelNameRef.current;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parking_alerts",
        },
        async (payload) => {
          fetchActiveCount();
          optionsRef.current.onAnyChange?.();

          if (payload.eventType === "INSERT") {
            const newId = (payload.new as { id?: string })?.id;
            if (!newId) return;

            // Fetch fully joined alert record
            const { data, error } = await supabase
              .from("parking_alerts")
              .select(`
                *,
                vehicle:vehicles(plate_number, make, model, color),
                owner:profiles!parking_alerts_owner_id_fkey(name_ar, name_en, mobile, employee_id),
                reporter:profiles!parking_alerts_reporter_id_fkey(name_ar, name_en, mobile, employee_id),
                alert_type:parking_alert_types(code, name_ar, name_en)
              `)
              .eq("id", newId)
              .single();

            const fullAlert =
              !error && data
                ? (data as unknown as ParkingAlert)
                : (payload.new as ParkingAlert);

            if (enableNotifications) {
              // 1. Audio chime
              playAlertChime();
              // 2. Haptic vibration
              triggerHapticNotification();
              // 3. Browser notification
              const plate = fullAlert.vehicle?.plate_number || "غير محدد";
              const msg = fullAlert.message || "تنبيه تحريك سيارة";
              showBrowserNotification(`🔔 تنبيه مواقف: سيارة ${plate}`, {
                body: msg,
              });
            }

            optionsRef.current.onAlertInserted?.(fullAlert);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as ParkingAlert;
            optionsRef.current.onAlertUpdated?.(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, enableNotifications, enabled]);

  return {
    activeCount,
    refreshActiveCount: fetchActiveCount,
  };
}
