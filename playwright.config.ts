import { defineConfig } from "@playwright/test";

// The browser checks (issue #80). They run on a production build, with a temporary account on the Supabase project.
// Run them with `npm run e2e` (see README.md). They are not in CI, because they need SUPABASE_SECRET_KEY.
const port = 3100;
const base = process.env.BASE_URL ?? `http://localhost:${port}`;

// A Chromium that Playwright did not install itself (for example on a cloud machine): CHROMIUM_PATH=/path/to/chrome.
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // Each test has its own account, so tests can run side by side. Few workers, so the Supabase project is not busy.
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: base, launchOptions: { executablePath }, trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
    { name: "laptop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  // A production build, then the server. With BASE_URL, the suite uses a server that already runs.
  webServer: process.env.BASE_URL ? undefined : { command: `npm run build && npm start -- --port ${port}`, url: base, timeout: 600_000, reuseExistingServer: false },
});
