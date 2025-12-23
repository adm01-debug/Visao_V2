import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should navigate through main pages", async ({ page }) => {
    await page.goto("/");
    
    // Dashboard
    await expect(page.locator("h1")).toContainText("Dashboard");
    
    // Cameras
    await page.click("[data-testid=nav-cameras]");
    await expect(page).toHaveURL(/.*cameras/);
    
    // Alerts
    await page.click("[data-testid=nav-alerts]");
    await expect(page).toHaveURL(/.*alerts/);
    
    // Settings
    await page.click("[data-testid=nav-settings]");
    await expect(page).toHaveURL(/.*settings/);
  });

  test("should toggle sidebar", async ({ page }) => {
    await page.goto("/");
    await page.click("[data-testid=sidebar-toggle]");
    await expect(page.locator("[data-testid=sidebar]")).toHaveClass(/collapsed/);
  });
});
