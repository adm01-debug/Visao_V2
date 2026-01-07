/**
 * @fileoverview E2E Test Utilities
 * @description Helper functions for E2E testing
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page, timeout = 10000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take a screenshot with metadata
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {}
): Promise<Buffer> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  
  return page.screenshot({
    path: `test-results/screenshots/${filename}`,
    fullPage: options.fullPage ?? true,
  });
}

/**
 * Wait for element and ensure it's visible
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ 
      state: 'visible', 
      timeout 
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe click - waits for element and clicks
 */
export async function safeClick(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    await element.click();
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe fill - waits for input and fills value
 */
export async function safeFill(
  page: Page,
  selector: string,
  value: string,
  timeout = 5000
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    await element.fill(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if element exists and is visible
 */
export async function isElementVisible(
  page: Page,
  selector: string,
  timeout = 3000
): Promise<boolean> {
  try {
    return await page.locator(selector).first().isVisible({ timeout });
  } catch {
    return false;
  }
}

/**
 * Get text content of element
 */
export async function getElementText(
  page: Page,
  selector: string,
  timeout = 3000
): Promise<string | null> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    return await element.textContent();
  } catch {
    return null;
  }
}

/**
 * Wait for network request to complete
 */
export async function waitForRequest(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForRequest(urlPattern, { timeout });
}

/**
 * Wait for network response
 */
export async function waitForResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(urlPattern, { timeout });
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: object,
  status = 200
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Clear all mocked routes
 */
export async function clearMocks(page: Page): Promise<void> {
  await page.unrouteAll();
}

/**
 * Login helper - simulates user login
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string
): Promise<boolean> {
  try {
    await page.goto('/login');
    await waitForPageLoad(page);
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(email);
      await passwordInput.fill(password);
      await submitButton.click();
      await page.waitForTimeout(2000);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Logout helper
 */
export async function logoutUser(page: Page): Promise<boolean> {
  try {
    const userMenu = page.locator('[class*="avatar"], button[aria-label*="user"]').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.waitForTimeout(300);
      
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sair")').first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Navigate and verify page
 */
export async function navigateAndVerify(
  page: Page,
  path: string,
  expectedElement: string,
  timeout = 5000
): Promise<boolean> {
  try {
    await page.goto(path);
    await waitForPageLoad(page);
    return await waitForElement(page, expectedElement, timeout);
  } catch {
    return false;
  }
}

/**
 * Check for console errors
 */
export async function checkForConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  return errors;
}

/**
 * Get performance metrics
 */
export async function getPerformanceMetrics(page: Page): Promise<{
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
}> {
  const timing = await page.evaluate(() => {
    const perf = window.performance;
    const timing = perf.timing;
    
    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstContentfulPaint: 0,
    };
  });
  
  return timing;
}

/**
 * Verify accessibility basics
 */
export async function checkBasicAccessibility(page: Page): Promise<{
  hasTitle: boolean;
  hasH1: boolean;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
}> {
  return page.evaluate(() => {
    const title = document.title;
    const h1 = document.querySelector('h1');
    const images = document.querySelectorAll('img');
    
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;
    
    images.forEach((img) => {
      if (img.alt) {
        imagesWithAlt++;
      } else {
        imagesWithoutAlt++;
      }
    });
    
    return {
      hasTitle: !!title,
      hasH1: !!h1,
      imagesWithAlt,
      imagesWithoutAlt,
    };
  });
}

/**
 * Test viewport responsiveness
 */
export async function testResponsiveness(
  page: Page,
  viewports: Array<{ width: number; height: number; name: string }>
): Promise<Array<{ name: string; screenshot: Buffer }>> {
  const results: Array<{ name: string; screenshot: Buffer }> = [];
  
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500);
    
    const screenshot = await page.screenshot({ fullPage: true });
    results.push({ name: viewport.name, screenshot });
  }
  
  return results;
}

/**
 * Common viewports for testing
 */
export const COMMON_VIEWPORTS = [
  { width: 375, height: 667, name: 'iPhone SE' },
  { width: 390, height: 844, name: 'iPhone 12' },
  { width: 768, height: 1024, name: 'iPad' },
  { width: 1024, height: 768, name: 'iPad Landscape' },
  { width: 1280, height: 720, name: 'Desktop HD' },
  { width: 1920, height: 1080, name: 'Desktop Full HD' },
];
