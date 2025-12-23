import { test, expect } from "@playwright/test";

test.describe("Theme", () => {
  test("toggles dark mode", async ({ page }) => {
    await page.goto("/");
    await page.click("[data-testid=theme-toggle]");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
  test("persists theme preference", async ({ page }) => {
    await page.goto("/");
    await page.click("[data-testid=theme-toggle]");
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
