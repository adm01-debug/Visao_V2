import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("should search and filter results", async ({ page }) => {
    await page.goto("/");
    
    await page.fill("[data-testid=search-input]", "camera");
    await expect(page.locator("[data-testid=search-results]")).toBeVisible();
    
    await page.click("[data-testid=search-result]");
    await expect(page).toHaveURL(/.*cameras/);
  });

  test("should show empty state for no results", async ({ page }) => {
    await page.goto("/");
    
    await page.fill("[data-testid=search-input]", "xyznonexistent");
    await expect(page.locator("[data-testid=no-results]")).toBeVisible();
  });
});
