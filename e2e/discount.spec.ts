import { test, expect } from "@playwright/test";
import { mockBackend, login } from "./helpers";

test.describe("Discounts / Promos", () => {
  test("selecting a promo auto-applies the discount", async ({ page }) => {
    await mockBackend(page, { role: "server" });
    await login(page);

    // Add Americano (Hot) — ₱69.00.
    await page.locator(".product-btn").first().click();
    await expect(page.locator("#pos-summary .sum-total")).toContainText("69");

    // Pick the "Senior" promo (10%) from the dropdown — no typing needed.
    await page.locator("#promo-select").selectOption("1");

    // 10% of 69 = 6.90 → total 62.10, labelled with the promo name.
    await expect(page.locator("#pos-summary .sum-total")).toContainText("62.10");
    await expect(page.locator("#pos-summary")).toContainText(/Senior/);
  });

  test("a custom discount is capped at the subtotal (never negative)", async ({ page }) => {
    await mockBackend(page, { role: "server" });
    await login(page);

    await page.locator(".product-btn").first().click(); // ₱69.00
    await page.locator("#promo-select").selectOption("__custom__");
    await page.locator("#custom-amount").fill("999");

    await expect(page.locator("#pos-summary .sum-total")).toContainText("0.00");
    await expect(page.locator("#pos-summary .sum-total")).not.toContainText("-");
  });
});
