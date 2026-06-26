import { test, expect } from "@playwright/test";
import { mockBackend, login } from "./helpers";

test.describe("Offline-first sync", () => {
  test("an order made offline is queued, then syncs when back online", async ({ page, context }) => {
    await mockBackend(page, { role: "server" });
    await login(page);

    // Build an order, then drop the connection before checkout.
    await page.locator(".product-btn").first().click();
    await context.setOffline(true);
    await expect(page.locator("#net-status")).toContainText(/offline/i);

    // Checkout offline: review, confirm, receipt still prints, sale queued locally.
    await page.locator("#cash-input").fill("500");
    await page.locator("#checkout-btn").click();
    await page.locator("#confirm-sale-btn").click();
    await expect(page.locator(".receipt-paper")).toBeVisible();
    await expect(page.locator("#toast")).toContainText(/offline/i);

    // There should be one pending sale in the local queue.
    const pending = await page.evaluate(() => new Promise<number>((resolve) => {
      const req = indexedDB.open("hebrews-pos");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("pending_sales", "readonly");
        const all = tx.objectStore("pending_sales").getAll();
        all.onsuccess = () => resolve(all.result.length);
        all.onerror = () => resolve(-1);
      };
      req.onerror = () => resolve(-1);
    }));
    expect(pending).toBe(1);

    // Reconnect → the app auto-syncs the queued sale to the backend.
    await context.setOffline(false);
    await expect(page.locator("#toast")).toContainText(/synced/i, { timeout: 15_000 });
    await expect(page.locator("#net-status")).toContainText(/online/i);
  });
});
