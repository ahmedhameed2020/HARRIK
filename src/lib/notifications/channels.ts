/**
 * حَرِّك | HARRIK — Notification channel abstraction.
 *
 * Provider-agnostic fan-out for SMS and Email. Every channel degrades safely:
 * when the required environment variables are absent, the call is a no-op that
 * reports `not_configured` instead of throwing, so alerting never breaks.
 */

export interface ChannelResult {
  channel: "sms" | "email";
  sent: boolean;
  skippedReason?: "not_configured" | "invalid_recipient" | "provider_error";
  detail?: string;
}

const SMS_PROVIDER = process.env.SMS_PROVIDER || ""; // "twilio" | "unifonic" | ""
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER || "";
const UNIFONIC_APP_SID = process.env.UNIFONIC_APP_SID || "";
const UNIFONIC_SENDER = process.env.UNIFONIC_SENDER_ID || "";

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || ""; // "resend" | "sendgrid" | ""
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@harrik.app";

function digitsOnly(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/**
 * Sends an SMS through the configured provider. Returns a structured result
 * and never throws.
 */
export async function sendSms(to: string, body: string): Promise<ChannelResult> {
  const recipient = digitsOnly(to);
  if (!recipient) {
    return { channel: "sms", sent: false, skippedReason: "invalid_recipient" };
  }

  try {
    if (SMS_PROVIDER === "twilio" && TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: `+${recipient}`, From: TWILIO_FROM, Body: body }),
        }
      );
      return res.ok
        ? { channel: "sms", sent: true }
        : { channel: "sms", sent: false, skippedReason: "provider_error", detail: `twilio:${res.status}` };
    }

    if (SMS_PROVIDER === "unifonic" && UNIFONIC_APP_SID) {
      const res = await fetch("https://el.cloud.unifonic.com/rest/SMS/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          AppSid: UNIFONIC_APP_SID,
          SenderID: UNIFONIC_SENDER,
          Recipient: recipient,
          Body: body,
        }),
      });
      return res.ok
        ? { channel: "sms", sent: true }
        : { channel: "sms", sent: false, skippedReason: "provider_error", detail: `unifonic:${res.status}` };
    }

    return { channel: "sms", sent: false, skippedReason: "not_configured" };
  } catch (err: any) {
    return { channel: "sms", sent: false, skippedReason: "provider_error", detail: err?.message };
  }
}

/**
 * Sends a transactional email through the configured provider. Never throws.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<ChannelResult> {
  if (!to || !to.includes("@")) {
    return { channel: "email", sent: false, skippedReason: "invalid_recipient" };
  }

  try {
    if (EMAIL_PROVIDER === "resend" && RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
      });
      return res.ok
        ? { channel: "email", sent: true }
        : { channel: "email", sent: false, skippedReason: "provider_error", detail: `resend:${res.status}` };
    }

    if (EMAIL_PROVIDER === "sendgrid" && SENDGRID_API_KEY) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: EMAIL_FROM },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });
      return res.ok
        ? { channel: "email", sent: true }
        : { channel: "email", sent: false, skippedReason: "provider_error", detail: `sendgrid:${res.status}` };
    }

    return { channel: "email", sent: false, skippedReason: "not_configured" };
  } catch (err: any) {
    return { channel: "email", sent: false, skippedReason: "provider_error", detail: err?.message };
  }
}

export function isSmsConfigured(): boolean {
  if (SMS_PROVIDER === "twilio") return Boolean(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);
  if (SMS_PROVIDER === "unifonic") return Boolean(UNIFONIC_APP_SID);
  return false;
}

export function isEmailConfigured(): boolean {
  if (EMAIL_PROVIDER === "resend") return Boolean(RESEND_API_KEY);
  if (EMAIL_PROVIDER === "sendgrid") return Boolean(SENDGRID_API_KEY);
  return false;
}
