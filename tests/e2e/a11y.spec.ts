import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * حَرِّك | HARRIK — Accessibility audit with axe-core (§11.7).
 *
 * Runs the WCAG 2.1 A/AA rule set on every key surface and fails on
 * `serious` / `critical` violations. Needs only a running server; the
 * authenticated pages are skipped unless E2E_EMAIL / E2E_PASSWORD are set.
 *
 *   pnpm test:a11y
 *   pnpm test:e2e:local tests/e2e/a11y.spec.ts
 */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const hasCreds = Boolean(EMAIL && PASSWORD);

const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

async function audit(page: Page, label: string) {
  // Data-dependent surfaces (inbox history, admin tables) render their rows a
  // moment after the shell. Settle first, otherwise the audit silently checks
  // the empty state and misses real violations.
  await page.waitForTimeout(2500);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // The QR code is decorative in context and has an adjacent text label.
    .disableRules(["color-contrast-enhanced"])
    .analyze();

  const blocking = results.violations.filter((v) =>
    BLOCKING_IMPACTS.has(String(v.impact))
  );

  const summary = blocking
    .map(
      (v) =>
        `• [${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join("\n    ")}`
    )
    .join("\n");

  expect(blocking, `${label} — axe serious/critical violations:\n${summary}`).toEqual([]);
}

test.describe("Accessibility (axe)", () => {
  // Dev-mode compiles pages on demand; allow a generous budget per page.
  test.describe.configure({ timeout: 240_000 });

  test("login page has no serious violations", async ({ page }) => {
    await page.goto("/login");
    await audit(page, "/login");
  });

  test("forgot-password page has no serious violations", async ({ page }) => {
    await page.goto("/forgot-password");
    await audit(page, "/forgot-password");
  });

  test("register wizard has no serious violations", async ({ page }) => {
    await page.goto("/register");
    await audit(page, "/register");
  });

  test("scan error state has no serious violations", async ({ page }) => {
    await page.goto("/scan?token=not-a-uuid");
    await expect(page.getByText(/تعذر التحقق|Could not verify/i)).toBeVisible({
      timeout: 60_000,
    });
    await audit(page, "/scan (invalid token)");
  });

  test.describe("authenticated surfaces", () => {
    test.skip(!hasCreds, "E2E_EMAIL / E2E_PASSWORD are not configured");

    async function signIn(page: Page) {
      await page.goto("/login");
      await page.getByTestId("login-email").fill(EMAIL!);
      await page.getByTestId("login-password").fill(PASSWORD!);
      await page.getByTestId("login-submit").click();
      await expect(page).not.toHaveURL(/\/login/, { timeout: 90_000 });
    }

    for (const path of ["/", "/inbox", "/profile", "/admin"]) {
      test(`${path} has no serious violations`, async ({ page }) => {
        await signIn(page);
        await page.goto(path);
        await expect(page.getByTestId("main-content")).toBeVisible();
        await audit(page, path);
      });
    }
  });
});
