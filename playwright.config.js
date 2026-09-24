import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 300000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { actionTimeout: 15000, baseURL: "http://localhost:3000", ...devices["Desktop Chrome"] },
  webServer: { command: "node server.js", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
