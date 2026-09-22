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
import {
  ownerAlertPush,
  ownerAlertSms,
  securityEscalationPush,
  resolveNotificationLang,
  type NotificationLang,
  type SecurityEscalation,
} from "@/lib/notifications/messages";

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
  /**
   * Why security is being pulled in. The wording is resolved per recipient, in
   * their own language, rather than passed in as a fixed string.
   */
  escalation: SecurityEscalation;
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
      .select("id, preferred_language")
      .eq("organization_id", input.organizationId)
      .eq("is_active", true)
      .in("role", ["admin", "super_admin", "security"]);

    const recipients = (securityProfiles || []).filter(
      (p: any) => p.id !== input.ownerId
    );

    if (recipients.length === 0) return 0;

    const { data: secSubs } = await supabase
      .from("push_subscriptions")
      .select("profile_id, endpoint, p256dh, auth")
      .in(
        "profile_id",
        recipients.map((p: any) => p.id)
      )
      .eq("organization_id", input.organizationId);

    if (!secSubs || secSubs.length === 0) return 0;

    // A security team is not necessarily monolingual: each member is pushed in
    // the language they chose, so the batches are split by language rather
    // than by person (one push call per language, not per recipient).
    const langByProfile = new Map<string, NotificationLang>(
      recipients.map((p: any) => [p.id, resolveNotificationLang(p.preferred_language)])
    );

    const byLang = new Map<NotificationLang, SubRow[]>();
    for (const sub of secSubs as Array<SubRow & { profile_id: string }>) {
      const lang = langByProfile.get(sub.profile_id) ?? "ar";
      const bucket = byLang.get(lang);
      if (bucket) bucket.push(sub);
      else byLang.set(lang, [sub]);
    }

    const plate = input.plateDisplay || "";
    const tag = `escalation-${input.alertId || plate || "alert"}`;

    let sent = 0;
    for (const [lang, subs] of byLang) {
      const message = securityEscalationPush(lang, input.escalation);
      const batch = await sendPushBatch(supabase, subs, {
        ...message,
        url: "/inbox",
        tag,
      });
      sent += batch.sent;
    }

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
    // The owner's row carries everything both channels need: the language to
    // write in, the number to fall back to, and whether they asked for that
    // fallback at all. Read once, used by the push below and the SMS further
    // down.
    let ownerLang: NotificationLang = "ar";
    let ownerMobile: string | null = null;
    let ownerChannel = "push";

    if (input.ownerId) {
      const { data: ownerRow } = await supabase
        .from("profiles")
        .select("preferred_language, mobile, notification_channel")
        .eq("id", input.ownerId)
        .maybeSingle();

      ownerLang = resolveNotificationLang((ownerRow as any)?.preferred_language);
      ownerMobile = (ownerRow as any)?.mobile || null;
      ownerChannel = (ownerRow as any)?.notification_channel || "push";
    }

    // 1. Owner push
    if (input.ownerId) {
      const { data: ownerSubs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("profile_id", input.ownerId)
        .eq("organization_id", input.organizationId);

      if (ownerSubs && ownerSubs.length > 0) {
        const { sent, expired } = await sendPushBatch(supabase, ownerSubs as SubRow[], {
          ...ownerAlertPush(ownerLang, { plate, reporter }),
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
        escalation: { kind: "owner_unreachable", plate },
      });

      // 3. Optional SMS to the owner — needs a configured provider, a number,
      //    and the owner having opted into the fallback in /profile.
      if (input.ownerId && isSmsConfigured() && ownerMobile && ownerChannel !== "push") {
        try {
          result.smsAttempted = true;
          await sendSms(ownerMobile, ownerAlertSms(ownerLang, { plate }));
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
