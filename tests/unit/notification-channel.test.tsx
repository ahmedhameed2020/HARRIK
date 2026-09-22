// @vitest-environment jsdom
/**
 * حَرِّك | HARRIK — the owner's alert delivery channel must be settable.
 *
 * `profiles.notification_channel` has existed since migration 07 and the alert
 * dispatcher reads it to decide whether an owner whose push notification could
 * not be delivered should also get an SMS. Nothing ever *wrote* it: there was
 * no control in /profile and the API ignored the field, so it stayed at its
 * 'push' default for every user and the SMS fallback was unreachable code.
 *
 * These tests hold that door open: the control exists, it is initialised from
 * the saved value, and saving the form sends the field to the API.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, refreshProfile: vi.fn() }),
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ lang: "ar", setLang: () => {}, theme: "light", toggleTheme: () => {} }),
}));

vi.mock("@/lib/haptics", () => ({ triggerHaptic: () => {} }));

vi.mock("@/hooks/useWebPush", () => ({
  useWebPush: () => ({
    isSupported: false,
    isSubscribed: false,
    loading: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

vi.mock("@/lib/biometric", () => ({
  isBiometricSupported: () => false,
  isPlatformAuthenticatorAvailable: async () => false,
  isBiometricEnabled: () => false,
  registerBiometric: vi.fn(),
  verifyBiometric: vi.fn(),
  disableBiometric: vi.fn(),
}));

const PROFILE = {
  id: "u1",
  name_ar: "أحمد حسن",
  name_en: "Ahmed Hassan",
  employee_id: "1024",
  mobile: "+97455512345",
  role: "staff",
  preferred_language: "ar" as const,
  notification_channel: "push_sms" as const,
};

/** Answers every endpoint the profile screen touches on mount. */
function installFetch(patchSpy: ReturnType<typeof vi.fn>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      patchSpy(JSON.parse(String(init.body)));
      return { ok: true, status: 200, json: async () => ({ success: true, profile: PROFILE }) };
    }
    if (String(url).includes("/api/profile/devices")) {
      return { ok: true, status: 200, json: async () => ({ success: true, devices: [] }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, profile: PROFILE, vehicles: [] }),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("alert delivery channel in /profile", () => {
  it("offers the channel control, initialised from the saved value", async () => {
    installFetch(vi.fn());
    const { default: ProfilePage } = await import("@/app/profile/page");

    render(<ProfilePage />);

    const select = (await screen.findByLabelText(/قناة استقبال التنبيهات/)) as HTMLSelectElement;
    // The saved preference, not the 'push' default.
    expect(select.value).toBe("push_sms");

    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["push", "push_sms", "all"]);
  });

  it("sends the channel to the API when the profile is saved", async () => {
    const patchSpy = vi.fn();
    installFetch(patchSpy);
    const { default: ProfilePage } = await import("@/app/profile/page");

    render(<ProfilePage />);

    const select = (await screen.findByLabelText(/قناة استقبال التنبيهات/)) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "all" } });

    fireEvent.click(screen.getByRole("button", { name: /حفظ التغييرات/ }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(patchSpy.mock.calls[0][0]).toMatchObject({ notification_channel: "all" });
  });
});
