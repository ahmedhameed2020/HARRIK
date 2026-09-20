/**
 * حَرِّك | HARRIK — Alert notification dispatch with automatic escalation.
 *
 * Primary channel: Web Push to the vehicle owner.
 * Fallback (when the owner has no active subscription, or is not acknowledged):
 *   1. Push to the organization's security & administrators.
 *   2. Optional SMS to the owner when the tenant/provider enables it.
 *
 * All operations are best-effort and never throw.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWebPushNotification } from "@/lib/push/vapid";
import { sendSms, isSmsConfigured } from "@/lib/notifications/channels";

export interface AlertDispatchInput {
  organizationId: string;
  ownerId?: string | null;
  alertId?: string | null;
  plateDisplay?: string;
  reporterName?: string;
  url?: string;
}

export interface AlertDispatchResult {
  ownerPushCount: number;
  escalated: boolean;
  securityPushCount: number;
  smsAttempted: boolean;
  expiredEndpointsRemoved: number;
}

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendPushBatch(
  supabase: SupabaseClient,
  subs: SubRow[],
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ sent: number; expired: string[] }> {
  let sent = 0;
  const expired: string[] = [];

  for (const sub of subs) {
    try {
      await sendWebPushNotification(sub, payload);
      sent++;
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        expired.push(sub.endpoint);
      }
    }
  }

  if (expired.length > 0) {
    try {
      await supabase.from("push_subscriptions").delete().in("endpoint", expired);
    } catch {
      // ignore cleanup failures
    }
  }

  return { sent, expired };
}

export interface SecurityNotifyInput {
  organizationId: string;
  /** Excluded from the recipient list (they are the owner, not the responder). */
  ownerId?: string | null;
  plateDisplay?: string;
  alertId?: string | null;
  title?: string;
  body?: string;
}

/**
 * Pushes a notification to the organization's security & administrators.
 * Returns the number of successful pushes. Never throws.
 */
export async function notifySecurityTeam(
  supabase: SupabaseClient,
  input: SecurityNotifyInput
): Promise<number> {
  try {
    const { data: securityProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("is_active", true)
      .in("role", ["admin", "super_admin", "security"]);

    const securityIds = (securityProfiles || [])
      .map((p: any) => p.id)
      .filter((id: string) => id !== input.ownerId);

    if (securityIds.length === 0) return 0;

    const { data: secSubs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("profile_id", securityIds)
      .eq("organization_id", input.organizationId);

    if (!secSubs || secSubs.length === 0) return 0;

    const plate = input.plateDisplay || "";
    const { sent } = await sendPushBatch(supabase, secSubs as SubRow[], {
      title: input.title || "⚠️ تنبيه موقف بحاجة لمتابعة",
      body:
        input.body ||
        (plate
          ? `التنبيه الخاص بالسيارة (${plate}) لم يُستلم. يرجى المتابعة الميدانية.`
          : "تنبيه موقف لم يُستلم. يرجى المتابعة الميدانية."),
      url: "/inbox",
      tag: `escalation-${input.alertId || plate || "alert"}`,
    });

    return sent;
  } catch {
    return 0;
  }
}

/**
 * Dispatches an alert to the owner and escalates to security/admin when the
 * owner cannot be reached via push.
 */
export async function dispatchAlertNotifications(
  supabase: SupabaseClient,
  input: AlertDispatchInput
): Promise<AlertDispatchResult> {
  const result: AlertDispatchResult = {
    ownerPushCount: 0,
    escalated: false,
    securityPushCount: 0,
    smsAttempted: false,
    expiredEndpointsRemoved: 0,
  };

  const plate = input.plateDisplay || "";
  const reporter = input.reporterName || "";
  const targetUrl = input.url || "/inbox";

  try {
    // 1. Owner push
    if (input.ownerId) {
      const { data: ownerSubs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("profile_id", input.ownerId)
        .eq("organization_id", input.organizationId);

      if (ownerSubs && ownerSubs.length > 0) {
        const { sent, expired } = await sendPushBatch(supabase, ownerSubs as SubRow[], {
          title: "🚨 تنبيه تحريك سيارة عاجل",
          body: plate
            ? `سيارتك (${plate}) مطلوبة للتحريك${reporter ? ` بواسطة: ${reporter}` : ""}`
            : "لديك تنبيه جديد لتحريك سيارتك في المواقف",
          url: `/inbox${input.alertId ? `?alert=${input.alertId}` : ""}`,
          tag: input.alertId ? `alert-${input.alertId}` : "harrik-alert",
        });
        result.ownerPushCount = sent;
        result.expiredEndpointsRemoved += expired.length;
      }
    }

    // 2. Escalation when the owner is unreachable via push
    if (result.ownerPushCount === 0) {
      result.escalated = true;

      result.securityPushCount = await notifySecurityTeam(supabase, {
        organizationId: input.organizationId,
        ownerId: input.ownerId,
        plateDisplay: plate,
        alertId: input.alertId,
        title: "⚠️ تنبيه موقف لم يصل لمالكه",
        body: plate
          ? `تعذّر إشعار مالك السيارة (${plate}). يرجى المتابعة الميدانية.`
          : "تعذّر إشعار مالك السيارة. يرجى المتابعة الميدانية.",
      });

      // 3. Optional SMS to the owner (tenant/provider must enable it)
      if (input.ownerId && isSmsConfigured()) {
        try {
          const { data: ownerRow } = await supabase
            .from("profiles")
            .select("mobile, notification_channel")
            .eq("id", input.ownerId)
            .maybeSingle();

          const channel = (ownerRow as any)?.notification_channel || "push";
          if (ownerRow?.mobile && channel !== "push") {
            result.smsAttempted = true;
            await sendSms(
              ownerRow.mobile,
              plate
                ? `حَرِّك: سيارتك (${plate}) تعيق الحركة في المواقف. يرجى تحريكها.`
                : "حَرِّك: يرجى تحريك سيارتك في المواقف."
            );
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // best-effort: never propagate notification failures
  }

  return result;
}
