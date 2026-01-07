import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

/**
 * Playwright E2E Test Configuration with Coverage Reports
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: isCI,
  
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: isCI ? 1 : undefined,
  
  /* Global timeout for each test */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
  
  /* Reporter configuration with multiple outputs for coverage */
  reporter: isCI 
    ? [
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "test-results/results.json" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
        ["github"],
        ["list"],
      ]
    : [
        ["html", { outputFolder: "playwright-report", open: "on-failure" }],
        ["json", { outputFile: "test-results/results.json" }],
        ["list"],
      ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: isCI ? "http://localhost:4173" : "http://localhost:5173",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",
    
    /* Capture screenshot on failure - full page */
    screenshot: {
      mode: "only-on-failure",
      fullPage: true,
    },
    
    /* Record video on failure */
    video: {
      mode: "retain-on-failure",
      size: { width: 1280, height: 720 },
    },
    
    /* Maximum time each action such as `click()` can take */
    actionTimeout: 10000,
    
    /* Maximum time for navigation */
    navigationTimeout: 30000,
  },

  /* Output folder for test artifacts */
  outputDir: "test-results/",

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "firefox",
      use: { 
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "webkit",
      use: { 
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 720 },
      },
    },
    /* Test against mobile viewports */
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
    /* Test against tablet viewports */
    {
      name: "tablet",
      use: { ...devices["iPad Pro 11"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: isCI ? "npm run preview" : "npm run dev",
    url: isCI ? "http://localhost:4173" : "http://localhost:5173",
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
