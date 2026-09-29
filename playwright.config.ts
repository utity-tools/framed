import { defineConfig, devices } from "@playwright/test";

// Not 3000, so a dev server of another project never answers the tests.
const PORT = 3100;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Visitors arrive by tapping a card with their phone: mobile is the primary target.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // CI tests the production build; locally reuse a running dev server.
    command: isCI ? `next start --port ${PORT}` : `next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}` },
  },
});
