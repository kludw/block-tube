import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 30_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    actionTimeout: 10_000,
    trace: "retain-on-failure",
  },
});
