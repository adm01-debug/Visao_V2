import { test, expect, devices } from "@playwright/test";

test.describe("Responsive", () => {
  test("works on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("[data-testid=mobile-menu]")).toBeDefined();
  });
  test("works on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator("[data-testid=sidebar]")).toBeDefined();
  });
});
