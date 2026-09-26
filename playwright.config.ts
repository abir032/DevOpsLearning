import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 4400);

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  webServer: { command: "node scripts/serve.mjs", url: `http://127.0.0.1:${PORT}`, reuseExistingServer: true },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
