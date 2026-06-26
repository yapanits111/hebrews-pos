import { defineConfig, devices } from "@playwright/test";

// The live smoke project runs against the real deployed app.
const LIVE_URL = process.env.LIVE_URL || "https://hebrews-pos-libmanan.netlify.app";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      // Hermetic suite — Supabase mocked via route interception. Runs locally.
      name: "mocked",
      testIgnore: /smoke\//,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5500" },
    },
    {
      // Live smoke — hits the deployed site. No credentials, no DB writes.
      name: "live-smoke",
      testMatch: /smoke\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: LIVE_URL },
    },
  ],

  // Local static server for the mocked suite.
  webServer: {
    command: "npx serve -l 5500 .",
    url: "http://localhost:5500",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
