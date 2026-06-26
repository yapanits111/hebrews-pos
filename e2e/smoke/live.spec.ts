import { test, expect } from "@playwright/test";

// ============================================================
//  Live smoke test — runs against the REAL deployed app.
//  No credentials, no database writes: it only verifies the
//  public surface is up (menu + reachable staff login).
//  Run with:  npm run test:live
// ============================================================

test.describe("Live smoke (deployed site)", () => {
  test("public menu loads on the deployed app", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".pm-title")).toContainText("HEBREWS", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Staff Login" })).toBeVisible();
  });

  test("staff login screen is reachable", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Staff Login" }).click();
    await expect(page.locator("#li-email")).toBeVisible();
    await expect(page.locator("#li-btn")).toContainText(/log in/i);
  });
});
