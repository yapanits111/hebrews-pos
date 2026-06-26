import { Page, expect } from "@playwright/test";

// ============================================================
//  Test helpers — mock the Supabase backend with Playwright
//  route interception so the suite is hermetic (no real DB,
//  no credentials, no data pollution, deterministic in CI).
// ============================================================

export const TEST_USER = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "cashier@hebrews.local",
  password: "test-password",
};

// Sample menu returned by the mocked products endpoint.
export const PRODUCTS = [
  { id: 1, name: "Americano (Hot)", category: "Coffee", price: 69, stock: null, is_active: true },
  { id: 2, name: "Spanish Latte (Iced)", category: "Coffee", price: 109, stock: null, is_active: true },
  { id: 3, name: "Banana Bread", category: "Others", price: 55, stock: 12, is_active: true },
];

// Sample promos returned by the mocked promos endpoint.
export const PROMOS = [
  { id: 1, name: "Senior", type: "percent", value: 10, is_active: true },
  { id: 2, name: "Promo20", type: "fixed", value: 20, is_active: true },
];

function fakeSession() {
  return {
    access_token: "test-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "test-refresh-token",
    user: {
      id: TEST_USER.id,
      email: TEST_USER.email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "email" },
      user_metadata: { full_name: "Test Cashier" },
      created_at: new Date().toISOString(),
    },
  };
}

type MockOpts = { role?: "server" | "admin" | "superadmin"; sales?: any[]; saleItems?: any[] };

export async function mockBackend(page: Page, opts: MockOpts = {}) {
  const role = opts.role ?? "admin";

  // ---- Auth ----
  await page.route("**/auth/v1/token**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fakeSession()) }));
  await page.route("**/auth/v1/user**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fakeSession().user) }));
  await page.route("**/auth/v1/logout**", (route) =>
    route.fulfill({ status: 204, body: "" }));

  // ---- Profiles (.single() -> object) ----
  await page.route("**/rest/v1/profiles**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: TEST_USER.id, full_name: "Test Cashier", role }),
    }));

  // ---- Products ----
  await page.route("**/rest/v1/products**", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PRODUCTS) });
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" }); // PATCH stock, etc.
  });

  // ---- Sales ----
  await page.route("**/rest/v1/sales**", (route) => {
    if (route.request().method() === "POST")
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 1001, created_at: new Date().toISOString() }),
      });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.sales ?? []) });
  });

  // ---- Promos ----
  await page.route("**/rest/v1/promos**", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROMOS) });
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  // ---- Sale items ----
  await page.route("**/rest/v1/sale_items**", (route) => {
    if (route.request().method() === "POST")
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(opts.saleItems ?? []) });
  });

  // ---- Edge functions (e.g. create-user) ----
  await page.route("**/functions/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
}

// Log in through the real UI (token endpoint is mocked).
export async function login(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Staff Login" }).click();
  await page.locator("#li-email").fill(TEST_USER.email);
  await page.locator("#li-pass").fill(TEST_USER.password);
  await page.locator("#li-btn").click();
  await expect(page.locator(".topbar")).toBeVisible();
}
