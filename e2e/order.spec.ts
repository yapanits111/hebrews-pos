import { test, expect } from "@playwright/test";
import { mockBackend, login } from "./helpers";

test.describe("Orders", () => {
  test("complete a cash sale and show a receipt", async ({ page }) => {
    await mockBackend(page, { role: "server" });
    await login(page);

    // Add the first product to the cart.
    await page.locator(".product-btn").first().click();
    await expect(page.locator(".cart-item")).toHaveCount(1);

    // Cash is the default payment method — enter the amount tendered.
    await page.locator("#cash-input").fill("500");

    // Open the review modal, then confirm — only now is it saved + printed.
    await page.locator("#checkout-btn").click();
    await expect(page.locator(".review-modal")).toBeVisible();
    await page.locator("#confirm-sale-btn").click();

    // The receipt should appear with a total.
    const receipt = page.locator(".receipt-paper");
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText("TOTAL");
    await expect(receipt).toContainText("HEBREWS 11:1");
  });

  test("change is computed from cash tendered", async ({ page }) => {
    await mockBackend(page, { role: "server" });
    await login(page);

    await page.locator(".product-btn").first().click(); // ₱69.00
    await page.locator("#cash-input").fill("100");

    // Change line should reflect 100 - 69 = 31.
    await expect(page.locator("#change-line")).toContainText("31");
  });
});
