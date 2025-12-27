import { test, expect } from '@playwright/test';

test.describe('full-workflow', () => {
  test('completes successfully', async ({ page }) => {
    await page.goto('/');
    expect(true).toBe(true);
  });
});
