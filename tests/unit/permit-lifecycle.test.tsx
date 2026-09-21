// @vitest-environment jsdom
/**
 * حَرِّك | HARRIK — a printed permit must be revocable.
 *
 * The QR sticker lives on a windscreen: it can be photographed, copied, or stay
 * on a car that was sold. `POST/DELETE /api/profile/vehicles/permit` rotates and
 * revokes the token — and were the only endpoints in the app that nothing ever
 * called, so in practice a compromised sticker stayed valid forever.
 *
 * These cover the path a user actually takes: open the permit, issue a new code,
 * and see the QR change; or revoke it and see it marked dead.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ lang: "ar", setLang: () => {}, theme: "light", toggleTheme: () => {} }),
}));

vi.mock("@/lib/haptics", () => ({ triggerHaptic: () => {} }));

// The QR image itself is not under test; render a stable stand-in so the
// assertions can watch which token it was asked to encode.
const encoded: string[] = [];
vi.mock("qrcode", () => ({
  default: {
    toDataURL: async (url: string) => {
      encoded.push(url);
      return `data:image/png;base64,${encoded.length}`;
    },
  },
}));

const VEHICLE = {
  id: "veh-1",
  permit_token: "old-token-aaa",
  permit_status: "active",
  plate_number: "482731",
  make: "تويوتا",
  model: "لاند كروزر",
  color: "أبيض",
};

const PROFILE = {
  name_ar: "أحمد حسن",
  name_en: "Ahmed Hassan",
  employee_id: "1024",
  department_name: "الأمن",
  mobile: "+97455512345",
};

beforeEach(() => {
  encoded.length = 0;
  vi.stubGlobal("confirm", () => true);
  vi.stubGlobal("print", () => {});
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

async function renderModal(extra: Record<string, unknown> = {}) {
  const { ParkingPermitModal } = await import("@/components/ui/ParkingPermitModal");
  return render(
    <ParkingPermitModal isOpen onClose={() => {}} vehicle={VEHICLE} profile={PROFILE} {...extra} />
  );
}

describe("permit lifecycle", () => {
  it("encodes the vehicle's own token, never a shared placeholder", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await renderModal();

    await waitFor(() => expect(encoded.length).toBeGreaterThan(0));
    expect(encoded[0]).toContain("old-token-aaa");
  });

  it("issues a new code and re-encodes the QR with it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, permitToken: "new-token-bbb" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onPermitChanged = vi.fn();

    await renderModal({ onPermitChanged });
    await waitFor(() => expect(encoded.length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /إصدار رمز جديد/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/profile/vehicles/permit");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ vehicleId: "veh-1" });

    // The whole point: the sticker on the windscreen stops matching.
    await waitFor(() => expect(encoded.some((u) => u.includes("new-token-bbb"))).toBe(true));
    // The list behind the sheet must be refreshed, or it keeps the old token.
    expect(onPermitChanged).toHaveBeenCalled();
  });

  it("revokes the permit and says so", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderModal();

    fireEvent.click(screen.getByRole("button", { name: /إلغاء التصريح/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("vehicleId=veh-1");
    expect(init.method).toBe("DELETE");

    expect(await screen.findByText(/ملغى/)).toBeTruthy();
  });

  it("surfaces a failure instead of pretending the permit changed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ success: false, error: "غير مصرح لك بتدوير تصريح هذه السيارة" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderModal();
    await waitFor(() => expect(encoded.length).toBeGreaterThan(0));
    const before = encoded.length;

    fireEvent.click(screen.getByRole("button", { name: /إصدار رمز جديد/ }));

    expect(await screen.findByText(/غير مصرح/)).toBeTruthy();
    // The QR must still be the old, still-valid one.
    expect(encoded.length).toBe(before);
  });
});
