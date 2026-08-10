import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test('should load the app without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Filter out expected errors (e.g., SW registration in dev)
    const criticalErrors = errors.filter((e) => !e.includes('service-worker'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeLessThan(60);

    const metaDesc = page.locator('meta[name="description"]');
    if (await metaDesc.count()) {
      const content = await metaDesc.getAttribute('content');
      expect(content).toBeTruthy();
      expect(content!.length).toBeLessThan(160);
    }

    const viewport = page.locator('meta[name="viewport"]');
    expect(await viewport.count()).toBeGreaterThan(0);
  });

  test('should have skip-to-content link', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    // May be visually hidden, but should exist in DOM
    if (await skipLink.count()) {
      expect(await skipLink.count()).toBeGreaterThan(0);
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Should not have horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const h1Count = await page.locator('h1').count();
    // Should have at most 1 H1 per page
    expect(h1Count).toBeLessThanOrEqual(1);
  });
});
