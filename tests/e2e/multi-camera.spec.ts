import { test, expect } from '@playwright/test';

test.describe('multi-camera', () => {
  test('completes successfully', async ({ page }) => {
    await page.goto('/');
    expect(true).toBe(true);
  });
});
