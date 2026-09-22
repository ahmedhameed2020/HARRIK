// @vitest-environment jsdom
/**
 * حَرِّك | HARRIK — the admin list screens must stay usable on a phone.
 *
 * Every one of these screens renders a desktop table AND a mobile card list:
 * the table is `hidden md:block`, the cards are `md:hidden`. The screens sit
 * behind authentication, so a browser crawl cannot reach them without a seeded
 * tenant account — these tests render them directly instead, with the network
 * and the auth contexts stubbed, and assert that a phone user still gets every
 * record and every action.
 *
 * What would break without this: a future edit that drops the card list (or
 * renders it from the wrong array) leaves a 360px screen showing an
 * eight-column table with 45px columns, which is how these screens looked
 * before the mobile pass.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { id: "p1", organization_id: "org1", role: "admin" },
    isAdmin: true,
    isSecurity: false,
  }),
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ lang: "ar", setLang: () => {}, theme: "light", toggleTheme: () => {} }),
}));

vi.mock("@/lib/haptics", () => ({ triggerHaptic: () => {} }));

const PASS = {
  id: "pass-1",
  plate_number: "654321",
  normalized_plate: "654321",
  visitor_name: "محمد الأنصاري",
  visitor_mobile: "+97455512345",
  vehicle_make: "تويوتا",
  vehicle_model: "لاند كروزر",
  vehicle_color: "أبيض",
  host_name: "د. حمد الكواري",
  purpose: "اجتماع عمل",
  valid_from: new Date().toISOString(),
  valid_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  status: "active" as const,
  created_at: new Date().toISOString(),
};

const ORG = {
  organization_id: "org-1",
  name_en: "Qatar University",
  name_ar: "جامعة قطر",
  entity_type: "university",
  status: "active" as const,
  onboarding_status: "completed",
  member_count: 1200,
  vehicle_count: 3400,
  active_alert_count: 2,
  created_at: new Date().toISOString(),
};

function mockFetch(payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload,
  });
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

/** The card list is the phone layout; the table is hidden below `md`. */
function mobileCardList(container: HTMLElement) {
  return container.querySelector(".md\\:hidden");
}

function desktopTable(container: HTMLElement) {
  const table = container.querySelector("table");
  return table?.closest("[class*='hidden']") ?? null;
}

describe("admin visitor passes — phone layout", () => {
  it("renders every pass as a card, with the plate, the visitor and the actions", async () => {
    vi.stubGlobal("fetch", mockFetch({ success: true, passes: [PASS] }));
    const { default: AdminVisitorsPage } = await import("@/app/admin/visitors/page");

    const { container } = render(<AdminVisitorsPage />);

    await waitFor(() => expect(screen.getAllByText(PASS.visitor_name).length).toBeGreaterThan(0));

    const cards = mobileCardList(container);
    expect(cards, "the phone card list must exist").not.toBeNull();

    const cardText = cards!.textContent ?? "";
    expect(cardText).toContain(PASS.visitor_name);
    expect(cardText).toContain(PASS.host_name);
    expect(cardText).toContain(PASS.visitor_mobile);
    expect(cardText).toContain(PASS.vehicle_make);

    // The destructive and time-critical actions have to be reachable on a
    // phone, not only in the desktop table.
    const article = cards!.querySelector("article");
    expect(article).not.toBeNull();
    const labels = Array.from(article!.querySelectorAll("[aria-label]")).map((el) =>
      el.getAttribute("aria-label")
    );
    expect(labels.some((l) => l?.includes("تمديد"))).toBe(true);
    expect(labels.some((l) => l?.includes("إلغاء"))).toBe(true);
    expect(labels.some((l) => l?.includes("حذف"))).toBe(true);

    // Each of those controls is a 44px target.
    for (const button of Array.from(article!.querySelectorAll("button"))) {
      const cls = button.className;
      expect(
        /h-11|min-h-\[44px\]/.test(cls),
        `phone action "${button.getAttribute("aria-label")}" must be a 44px target, got: ${cls}`
      ).toBe(true);
    }
  });

  it("keeps the table for desktop only", async () => {
    vi.stubGlobal("fetch", mockFetch({ success: true, passes: [PASS] }));
    const { default: AdminVisitorsPage } = await import("@/app/admin/visitors/page");

    const { container } = render(<AdminVisitorsPage />);
    await waitFor(() => expect(container.querySelector("table")).not.toBeNull());

    const wrapper = desktopTable(container);
    expect(wrapper, "the table must be wrapped in a hidden md:block container").not.toBeNull();
    expect(wrapper!.className).toContain("md:block");
  });
});

describe("platform control centre — phone layout", () => {
  it("renders every tenant as a card with its status action", async () => {
    vi.stubGlobal("fetch", mockFetch({ organizations: [ORG] }));
    const { default: PlatformControlCenter } = await import("@/app/platform/page");

    const { container } = render(<PlatformControlCenter />);
    await waitFor(() => expect(screen.getAllByText(ORG.name_en).length).toBeGreaterThan(0));

    const cards = mobileCardList(container);
    expect(cards).not.toBeNull();

    const cardText = cards!.textContent ?? "";
    expect(cardText).toContain(ORG.name_en);
    expect(cardText).toContain(ORG.name_ar);
    expect(cardText).toContain(ORG.entity_type);
    // The counters that the desktop table shows in three separate columns.
    expect(cardText).toContain("1,200");
    expect(cardText).toContain("3,400");

    const action = cards!.querySelector("button");
    expect(action).not.toBeNull();
    expect(action!.className).toMatch(/min-h-\[44px\]/);
  });
});
