import { test, expect } from "@playwright/test";
import { mockBackend, login } from "./helpers";

test.describe("Authentication", () => {
  test("public visitor sees the menu and can open staff login", async ({ page }) => {
    await mockBackend(page, { role: "admin" });
    await page.goto("/");

    await expect(page.locator(".pm-title")).toContainText("HEBREWS");
    await page.getByRole("button", { name: "Staff Login" }).click();
    await expect(page.locator("#li-email")).toBeVisible();
  });

  test("staff can log in and reach the POS", async ({ page }) => {
    await mockBackend(page, { role: "admin" });
    await login(page);

    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.getByRole("button", { name: /Order/ })).toBeVisible();
  });

  test("session persists across a page reload", async ({ page }) => {
    await mockBackend(page, { role: "admin" });
    await login(page);
    await expect(page.locator(".topbar")).toBeVisible();

    await page.reload();

    // After a reload the user should STILL be logged in (not bounced to the menu).
    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.locator(".pm-title")).toHaveCount(0);
  });

  test("logout asks for confirmation before signing out", async ({ page }) => {
    await mockBackend(page, { role: "admin" });
    await login(page);

    await page.getByRole("button", { name: "Log out" }).click();

    const modal = page.locator(".confirm-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/log out of hebrews/i);

    // Cancel keeps you logged in.
    await modal.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator(".topbar")).toBeVisible();

    // Confirming actually logs out (back to the public menu).
    await page.getByRole("button", { name: "Log out" }).click();
    await page.locator(".confirm-modal").getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("button", { name: "Staff Login" })).toBeVisible();
  });

  test("wrong credentials show an error", async ({ page }) => {
    await mockBackend(page, { role: "admin" });
    // Override the token endpoint to reject the login.
    await page.route("**/auth/v1/token**", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }),
      }));

    await page.goto("/");
    await page.getByRole("button", { name: "Staff Login" }).click();
    await page.locator("#li-email").fill("nobody@example.com");
    await page.locator("#li-pass").fill("wrongpass");
    await page.locator("#li-btn").click();

    await expect(page.locator("#toast")).toContainText(/wrong email or password/i);
  });
});
