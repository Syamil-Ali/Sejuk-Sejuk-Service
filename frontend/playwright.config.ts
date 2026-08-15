import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3107";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL, trace: "on-first-retry" },
  webServer: {
    command: "next dev -p 3107",
    url: baseURL,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "chromium",
      grepInvert: /mobile workspace/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      grep: /mobile workspace/,
      use: { ...devices["Pixel 7"] },
    },
  ],
});
