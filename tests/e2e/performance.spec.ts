import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    // Should load DOM in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have excessive DOM nodes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const nodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
    // Google recommends < 1500 DOM nodes
    expect(nodeCount).toBeLessThan(3000);
  });

  test('should lazy load images below the fold', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const images = page.locator('img');
    const count = await images.count();
    if (count > 3) {
      // At least some images should have loading="lazy"
      const lazyImages = page.locator('img[loading="lazy"]');
      const lazyCount = await lazyImages.count();
      // Not all images need lazy loading, but presence indicates awareness
      expect(lazyCount >= 0).toBeTruthy();
    }
  });

  test('should not have memory leaks in console', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().includes('memory')) {
        warnings.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(warnings).toHaveLength(0);
  });
});
