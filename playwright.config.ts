import { defineConfig, devices } from "@playwright/test"

const baseURL = "http://127.0.0.1:59316"
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://bright-mouse-917.convex.cloud"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 14"], browserName: "webkit" },
    },
    {
      name: "mobile-se",
      use: { ...devices["iPhone SE"], browserName: "webkit" },
    },
    {
      name: "android-chrome",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_CONVEX_URL: convexUrl,
      UI_REVIEW: "1",
    },
  },
})
