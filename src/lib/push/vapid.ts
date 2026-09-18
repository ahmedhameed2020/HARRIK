import webpush from "web-push";

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BART6R8K4H5UgAnsX0pv2R_EOig_ysflTPNAx_9bYV28ebl9nMusM_TiRzXiyMvhbOto-zgteJ0uw89F4GjxkUc";

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "U-msDNoLsXzaCY8aBTmoOKmjbZPQhEDc-yVB2xE8MNE";

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:security@harrik.qa";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn("VAPID initialization error:", err);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
}

export async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload
) {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    return await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
  } catch (error: any) {
    console.warn("Failed to send web push notification:", error?.message || error);
    throw error;
  }
}
