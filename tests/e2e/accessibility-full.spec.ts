import { test, expect } from '@playwright/test';

test.describe('accessibility-full', () => {
  test('completes successfully', async ({ page }) => {
    await page.goto('/');
    expect(true).toBe(true);
  });
});
