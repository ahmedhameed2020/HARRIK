/**
 * حَرِّك | HARRIK — notification copy, per language.
 *
 * The app is bilingual everywhere a person looks, and each profile carries a
 * `preferred_language`. Notifications ignored it: every push and SMS was
 * hardcoded Arabic, so a member who had set the app to English was told in
 * Arabic that their car was blocking a lane — the one message that has to be
 * understood immediately, in the one place the user cannot switch language.
 *
 * The builders below are pure so the wording can be tested without a database
 * or a push provider, and so every notification has exactly one home.
 */

export type NotificationLang = "ar" | "en";

/**
 * Picks the first supported language from the candidates (a profile's
 * `preferred_language`, then an organization default), falling back to Arabic —
 * which is the column default and the primary language of the product.
 */
export function resolveNotificationLang(
  ...candidates: Array<string | null | undefined>
): NotificationLang {
  for (const candidate of candidates) {
    if (candidate === "ar" || candidate === "en") return candidate;
  }
  return "ar";
}

export interface PushMessage {
  title: string;
  body: string;
}

/** The alert as the vehicle owner receives it. */
export function ownerAlertPush(
  lang: NotificationLang,
  params: { plate?: string; reporter?: string }
): PushMessage {
  const plate = params.plate || "";
  const reporter = params.reporter || "";

  if (lang === "en") {
    return {
      title: "🚨 Urgent: move your vehicle",
      body: plate
        ? `Your vehicle (${plate}) needs to be moved${reporter ? ` — reported by ${reporter}` : ""}`
        : "You have a new request to move your vehicle",
    };
  }

  return {
    title: "🚨 تنبيه تحريك سيارة عاجل",
    body: plate
      ? `سيارتك (${plate}) مطلوبة للتحريك${reporter ? ` بواسطة: ${reporter}` : ""}`
      : "لديك تنبيه جديد لتحريك سيارتك في المواقف",
  };
}

/** The same alert as an SMS, when push could not reach the owner. */
export function ownerAlertSms(lang: NotificationLang, params: { plate?: string }): string {
  const plate = params.plate || "";

  if (lang === "en") {
    return plate
      ? `HARRIK: your vehicle (${plate}) is blocking the car park. Please move it.`
      : "HARRIK: please move your vehicle in the car park.";
  }

  return plate
    ? `حَرِّك: سيارتك (${plate}) تعيق الحركة في المواقف. يرجى تحريكها.`
    : "حَرِّك: يرجى تحريك سيارتك في المواقف.";
}

/**
 * Why the security team is being pulled in.
 *  - `owner_unreachable`: the owner has no working push subscription at all.
 *  - `no_response`: the owner was notified but has not acknowledged in time.
 */
export type SecurityEscalation =
  | { kind: "owner_unreachable"; plate?: string }
  | { kind: "no_response"; plate?: string; thresholdSeconds: number };

/** The escalation as the security team and administrators receive it. */
export function securityEscalationPush(
  lang: NotificationLang,
  escalation: SecurityEscalation
): PushMessage {
  const plate = escalation.plate || "";

  if (escalation.kind === "no_response") {
    const seconds = escalation.thresholdSeconds;
    if (lang === "en") {
      return {
        title: `⏰ Alert unacknowledged for ${seconds}s`,
        body: plate
          ? `The owner of vehicle (${plate}) has not responded to the alert. Please follow up on site.`
          : "The vehicle owner has not responded to the alert. Please follow up on site.",
      };
    }
    return {
      title: `⏰ تنبيه لم يُستلم خلال ${seconds} ثانية`,
      body: plate
        ? `لم يستجب مالك السيارة (${plate}) للتنبيه. يرجى المتابعة الميدانية.`
        : "لم يستجب مالك السيارة للتنبيه. يرجى المتابعة الميدانية.",
    };
  }

  if (lang === "en") {
    return {
      title: "⚠️ Alert did not reach the owner",
      body: plate
        ? `The owner of vehicle (${plate}) could not be notified. Please follow up on site.`
        : "The vehicle owner could not be notified. Please follow up on site.",
    };
  }

  return {
    title: "⚠️ تنبيه موقف لم يصل لمالكه",
    body: plate
      ? `تعذّر إشعار مالك السيارة (${plate}). يرجى المتابعة الميدانية.`
      : "تعذّر إشعار مالك السيارة. يرجى المتابعة الميدانية.",
  };
}
