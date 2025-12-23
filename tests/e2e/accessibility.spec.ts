import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("has skip link", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid=skip-link]")).toBeDefined();
  });
  test("has main landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toBeDefined();
  });
  test("has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const h1 = await page.locator("h1").count();
    expect(h1).toBeGreaterThan(0);
  });
});
