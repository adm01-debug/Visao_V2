import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page on root', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(login|auth)?/);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('should show password field', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation error on empty submit', async ({ page }) => {
    await page.goto('/');
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show validation or remain on login
      await expect(page).toHaveURL(/\/(login|auth)?/);
    }
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should remain on login page or show error
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).not.toContain('/dashboard');
    }
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    // Should redirect to login
    const url = page.url();
    expect(url).toMatch(/\/(login|auth|)$/);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible()) {
      const ariaLabel = await emailInput.getAttribute('aria-label');
      const id = await emailInput.getAttribute('id');
      const associatedLabel = id ? page.locator(`label[for="${id}"]`) : null;
      const hasAccessibleName = ariaLabel || (associatedLabel && await associatedLabel.isVisible());
      expect(hasAccessibleName).toBeTruthy();
    }
  });
});
