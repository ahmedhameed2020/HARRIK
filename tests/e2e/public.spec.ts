import { test, expect } from "@playwright/test";

/**
 * حَرِّك | HARRIK — Public-surface E2E (§13).
 *
 * These specs need only a running server — no database seed or credentials —
 * so they are the first line of defence after a deploy.
 */
test.describe("Public surfaces", () => {
  test("login renders RTL Arabic by default", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });

  test("invalid credentials surface a friendly error", async ({ page }) => {
    await page.goto("/login");

    await page.getByTestId("login-email").fill("nobody@example.invalid");
    await page.getByTestId("login-password").fill("definitely-wrong-123");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible({ timeout: 25_000 });
  });

  test("language switch flips direction and persists across reloads", async ({ page }) => {
    await page.goto("/login");

    await page.getByTestId("lang-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    // The preference is mirrored into a cookie, so SSR must agree after reload.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    // Restore for the other specs.
    await page.getByTestId("lang-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("theme switch toggles the dark class and persists", async ({ page }) => {
    await page.goto("/login");
    const html = page.locator("html");

    const startedDark = await html.evaluate((el) => el.classList.contains("dark"));
    await page.getByTestId("theme-toggle").click();

    if (startedDark) await expect(html).not.toHaveClass(/dark/);
    else await expect(html).toHaveClass(/dark/);

    await page.reload();
    if (startedDark) await expect(html).not.toHaveClass(/dark/);
    else await expect(html).toHaveClass(/dark/);

    // Restore.
    await page.getByTestId("theme-toggle").click();
  });

  test("protected routes redirect anonymous visitors to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("scan rejects a malformed permit token without leaking data", async ({ page }) => {
    await page.goto("/scan?token=not-a-uuid");
    await expect(page.getByText(/تعذر التحقق|Could not verify/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("forgot-password and register pages render", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await page.goto("/register");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("unknown routes are auth-gated for anonymous visitors", async ({ page }) => {
    // middleware protects every non-public path, so a bogus URL lands on /login
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/login/);
  });
});
