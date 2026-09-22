/**
 * حَرِّك | HARRIK — notifications speak the recipient's language.
 *
 * Every push and SMS used to be hardcoded Arabic, even though each profile
 * carries `preferred_language` and the rest of the app is fully bilingual. A
 * push notification is the one surface where the reader cannot switch language
 * themselves, and it is the message that has to be understood immediately.
 *
 * These cover both halves: the wording itself, and the dispatcher actually
 * choosing it per recipient — including a security team whose members have
 * picked different languages.
 */
import { describe, it, expect, vi } from "vitest";
import {
  ownerAlertPush,
  ownerAlertSms,
  securityEscalationPush,
  resolveNotificationLang,
} from "@/lib/notifications/messages";

describe("notification copy", () => {
  it("writes the owner alert in each language, with the plate", () => {
    const ar = ownerAlertPush("ar", { plate: "654321", reporter: "خالد" });
    const en = ownerAlertPush("en", { plate: "654321", reporter: "Khalid" });

    expect(ar.body).toContain("654321");
    expect(en.body).toContain("654321");
    expect(en.body).toContain("Khalid");
    // The English message must not fall back to Arabic copy.
    expect(en.title).not.toEqual(ar.title);
    expect(/[؀-ۿ]/.test(en.title + en.body)).toBe(false);
  });

  it("writes the owner SMS in each language", () => {
    const en = ownerAlertSms("en", { plate: "111222" });
    expect(en).toContain("111222");
    expect(/[؀-ۿ]/.test(en)).toBe(false);
    expect(/[؀-ۿ]/.test(ownerAlertSms("ar", { plate: "111222" }))).toBe(true);
  });

  it("distinguishes an unreachable owner from one who has not responded", () => {
    const unreachable = securityEscalationPush("en", { kind: "owner_unreachable", plate: "9" });
    const noResponse = securityEscalationPush("en", {
      kind: "no_response",
      plate: "9",
      thresholdSeconds: 90,
    });

    expect(unreachable.title).not.toEqual(noResponse.title);
    // The threshold belongs in the message: it tells the guard how long it has been.
    expect(noResponse.title).toContain("90");
  });

  it("falls back to Arabic for a missing or unknown language", () => {
    expect(resolveNotificationLang(undefined)).toBe("ar");
    expect(resolveNotificationLang(null, undefined)).toBe("ar");
    expect(resolveNotificationLang("fr")).toBe("ar");
    expect(resolveNotificationLang("en")).toBe("en");
    // First supported candidate wins: profile preference over org default.
    expect(resolveNotificationLang(null, "en")).toBe("en");
  });
});

/**
 * A minimal Supabase stand-in: enough query-builder surface for the dispatcher,
 * returning canned rows per table.
 */
function fakeSupabase(rows: Record<string, any[]>, onDelete?: (table: string) => void) {
  return {
    from(table: string) {
      const builder: any = {
        _table: table,
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        is: () => builder,
        lte: () => builder,
        order: () => builder,
        limit: () => builder,
        update: () => builder,
        delete: () => {
          onDelete?.(table);
          return builder;
        },
        maybeSingle: async () => ({ data: (rows[table] || [])[0] ?? null, error: null }),
        then: (resolve: any) => resolve({ data: rows[table] || [], error: null }),
      };
      return builder;
    },
  } as any;
}

describe("dispatcher picks the language per recipient", () => {
  it("pushes to the owner in their own language", async () => {
    const sent: any[] = [];
    vi.doMock("@/lib/push/vapid", () => ({
      sendWebPushNotification: async (_sub: any, payload: any) => {
        sent.push(payload);
      },
    }));
    vi.resetModules();

    const { dispatchAlertNotifications } = await import("@/lib/notifications/alert-dispatch");

    const supabase = fakeSupabase({
      profiles: [{ preferred_language: "en", mobile: null, notification_channel: "push" }],
      push_subscriptions: [{ endpoint: "https://push/1", p256dh: "k", auth: "a" }],
    });

    await dispatchAlertNotifications(supabase, {
      organizationId: "org-1",
      ownerId: "owner-1",
      plateDisplay: "482731",
    });

    expect(sent).toHaveLength(1);
    expect(/[؀-ۿ]/.test(sent[0].title + sent[0].body)).toBe(false);
    expect(sent[0].body).toContain("482731");

    vi.doUnmock("@/lib/push/vapid");
    vi.resetModules();
  });

  it("splits the security push by language when the team is mixed", async () => {
    const sent: Array<{ endpoint: string; payload: any }> = [];
    vi.doMock("@/lib/push/vapid", () => ({
      sendWebPushNotification: async (sub: any, payload: any) => {
        sent.push({ endpoint: sub.endpoint, payload });
      },
    }));
    vi.resetModules();

    const { notifySecurityTeam } = await import("@/lib/notifications/alert-dispatch");

    const supabase = fakeSupabase({
      profiles: [
        { id: "sec-ar", preferred_language: "ar" },
        { id: "sec-en", preferred_language: "en" },
      ],
      push_subscriptions: [
        { profile_id: "sec-ar", endpoint: "https://push/ar", p256dh: "k", auth: "a" },
        { profile_id: "sec-en", endpoint: "https://push/en", p256dh: "k", auth: "a" },
      ],
    });

    const count = await notifySecurityTeam(supabase, {
      organizationId: "org-1",
      plateDisplay: "482731",
      escalation: { kind: "owner_unreachable", plate: "482731" },
    });

    expect(count).toBe(2);

    const arabic = sent.find((s) => s.endpoint === "https://push/ar")!;
    const english = sent.find((s) => s.endpoint === "https://push/en")!;

    expect(/[؀-ۿ]/.test(arabic.payload.title)).toBe(true);
    expect(/[؀-ۿ]/.test(english.payload.title + english.payload.body)).toBe(false);

    vi.doUnmock("@/lib/push/vapid");
    vi.resetModules();
  });
});
