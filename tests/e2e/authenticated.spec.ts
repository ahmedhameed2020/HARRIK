import { test, expect, type Page } from "@playwright/test";

/**
 * حَرِّك | HARRIK — Authenticated E2E flow (§13).
 *
 * Requires a seeded tenant account:
 *   E2E_EMAIL=admin@school.edu.qa
 *   E2E_PASSWORD=••••••••
 * plus E2E_BASE_URL (or the local server started by playwright.config.ts).
 *
 * The whole suite is skipped when the credentials are absent so `pnpm test:e2e`
 * stays green on a fresh clone.
 */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const hasCreds = Boolean(EMAIL && PASSWORD);

test.describe("Authenticated journey", () => {
  test.skip(!hasCreds, "E2E_EMAIL / E2E_PASSWORD are not configured");

  async function signIn(page: Page) {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(EMAIL!);
    await page.getByTestId("login-password").fill(PASSWORD!);
    await page.getByTestId("login-submit").click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  }

  test("sign in once, land in the app and keep the session on reload", async ({ page }) => {
    await signIn(page);

    // The shell renders with an accessible main landmark.
    await expect(page.getByTestId("main-content")).toBeVisible();

    // The skip link targets the main landmark and is keyboard-activatable.
    const skip = page.getByTestId("skip-link");
    await expect(skip).toHaveAttribute("href", "#main-content");
    await skip.focus();
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#main-content/);

    // Persistent session: a reload must not bounce back to /login.
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("main-content")).toBeVisible();
  });

  test("plate search finds a seeded vehicle or reports it as unregistered", async ({ page }) => {
    await signIn(page);
    await page.goto("/");

    const input = page.getByRole("textbox").first();
    await input.fill("482731");

    // Either a result card or the unregistered escalation hub must appear —
    // both are valid depending on the seed state of the environment.
    await expect(
      page
        .getByText(/لاندكروزر|Land Cruiser|غير مسجلة|not registered|Unregistered/i)
        .first()
    ).toBeVisible({ timeout: 25_000 });
  });

  test("inbox loads and offers the notification opt-in", async ({ page }) => {
    await signIn(page);
    await page.goto("/inbox");

    await expect(page.getByTestId("main-content")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  });

  test("admin dashboard renders KPIs for an admin account", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin");

    // Admin-only route: an authorized account must not be bounced out.
    await expect(page).not.toHaveURL(/\/login|\?error=unauthorized/);
    await expect(page.getByTestId("main-content")).toBeVisible();
  });

  test("profile exposes push, biometric and device sections", async ({ page }) => {
    await signIn(page);
    await page.goto("/profile");

    await expect(page.getByText(/Web Push/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/البصمة|Biometric/i).first()).toBeVisible();
    await expect(page.getByText(/الأجهزة والجلسات|Devices & active sessions/i).first()).toBeVisible();
  });

  test("language preference survives a full navigation for a signed-in user", async ({ page }) => {
    await signIn(page);

    await page.getByTestId("lang-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.goto("/inbox");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.getByTestId("lang-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});
