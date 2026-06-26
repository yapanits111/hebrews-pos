import { test, expect } from "@playwright/test";
import { mockBackend, login } from "./helpers";

const now = new Date().toISOString();

const SALES = [
  { id: 1, total: 218, discount_amount: 0, payment_method: "Cash", created_at: now },
  { id: 2, total: 109, discount_amount: 10, payment_method: "GCash", created_at: now },
];

const SALE_ITEMS = [
  { name: "Spanish Latte (Iced)", qty: 2, line_total: 218, sales: { created_at: now } },
  { name: "Americano (Hot)", qty: 1, line_total: 69, sales: { created_at: now } },
];

test.describe("Analytics dashboard", () => {
  test("renders key metrics and charts for an admin", async ({ page }) => {
    await mockBackend(page, { role: "admin", sales: SALES, saleItems: SALE_ITEMS });
    await login(page);

    await page.getByRole("button", { name: /Analytics/ }).click();

    // KPI cards render with peso values.
    await expect(page.locator(".kpi").first()).toBeVisible();
    await expect(page.locator(".kpi-val").first()).toContainText("₱");

    // Revenue = 218 + 109 = ₱327.00.
    await expect(page.locator(".sales-summary")).toContainText("327");

    // At least one chart is rendered.
    await expect(page.locator(".bars").first()).toBeVisible();
  });
});
