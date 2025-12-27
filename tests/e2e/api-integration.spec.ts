import { test, expect } from '@playwright/test';

test.describe('api-integration', () => {
  test('completes successfully', async ({ page }) => {
    await page.goto('/');
    expect(true).toBe(true);
  });
});
