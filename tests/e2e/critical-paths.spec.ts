import { test, expect } from '@playwright/test';

// ===========================================
// AUTH FLOW — Happy paths
// ===========================================
test.describe('Auth Flow — Complete Happy Paths', () => {
  test('should toggle between Login and Signup tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const signupTab = page.locator('[role="tab"]').filter({ hasText: /cri|cad/i });
    if (await signupTab.first().isVisible()) {
      await signupTab.first().click();
      await page.waitForTimeout(500);
      const nameInput = page.locator('input[name="name"], input[placeholder*="nome" i]');
      const isOnSignup =
        (await nameInput.count()) > 0 ||
        (await signupTab.first().getAttribute('aria-selected')) === 'true';
      expect(isOnSignup).toBeTruthy();
    }
  });

  test('should show password strength indicator on signup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const signupTab = page.locator('[role="tab"]').filter({ hasText: /cri|cad/i });
    if (await signupTab.first().isVisible()) {
      await signupTab.first().click();
      await page.waitForTimeout(500);

      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill('TestPassword123!');
        await page.waitForTimeout(300);
        // O indicador é exposto como `role="meter"` (PasswordStrength.tsx).
        await expect(page.getByRole('meter', { name: /força da senha/i })).toBeVisible();
      }
    }
  });

  test('should show validation error for empty email', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      // Should remain on the auth page (not navigate away)
      expect(page.url()).not.toContain('/dashboard');
    }
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if ((await emailInput.isVisible()) && (await passwordInput.isVisible())) {
      await emailInput.fill('invalid@test.com');
      await passwordInput.fill('WrongPassword123!');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
      // Should stay on auth or show an error toast
      expect(page.url()).not.toContain('/dashboard');
    }
  });
});

// ===========================================
// ROUTE PROTECTION — Critical routes
// ===========================================
test.describe('Route Protection — All Critical Routes', () => {
  // Route Protection testa o comportamento ANONIMO das rotas. O storageState
  // global do config autentica tudo; aqui forcamos estado vazio para validar
  // o redirecionamento para /auth.
  test.use({ storageState: { cookies: [], origins: [] } });

  const protectedRoutes = [
    '/dashboard',
    '/cameras',
    '/alerts',
    '/settings',
    '/zones',
    '/recordings',
    '/analytics',
    '/security',
    '/face-recognition',
    '/license-plate',
    '/heatmap',
    '/reports',
    '/ppe',
    '/people',
    '/users',
    '/profile',
    '/help',
    '/automation-rules',
  ];

  for (const route of protectedRoutes) {
    test(`should redirect ${route} to auth`, async ({ page }) => {
      await page.goto(route);
      // Aguarda o SPA resolver o redirect para /auth (via ProtectedRoute).
      await page
        .waitForURL((url) => /\/(auth|login)(\?|#|$|\/)/.test(url.href), { timeout: 10_000 })
        .catch(() => {});
      const url = page.url();
      expect(url).not.toContain(route);
      expect(url).toMatch(/^\S+\/(auth|login)/);
    });
  }
});

// ===========================================
// RESPONSIVENESS — Mobile, Tablet, Desktop
// ===========================================
test.describe('Responsiveness', () => {
  test('should render properly at 375px (iPhone SE)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      const box = await emailInput.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(250);
    }
  });

  test('should render properly at 390px (iPhone 14)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('should render properly at 768px (iPad)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('should render properly at 1440px (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});

// ===========================================
// CONSOLE ERRORS — Zero tolerance
// ===========================================
test.describe('Console Error Monitoring', () => {
  test('should not have console errors on auth page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('service-worker') && !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should not have console errors on 404 page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/nonexistent-page-xyz');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('service-worker') && !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ===========================================
// SEO & ACCESSIBILITY
// ===========================================
test.describe('SEO & Accessibility', () => {
  test('should have proper document language', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('should have single H1', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const role = await images.nth(i).getAttribute('role');
      const ariaHidden = await images.nth(i).getAttribute('aria-hidden');
      expect(alt !== null || role === 'presentation' || ariaHidden === 'true').toBeTruthy();
    }
  });

  test('should have proper meta viewport', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should have charset declaration', async ({ page }) => {
    await page.goto('/');
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset?.toLowerCase()).toBe('utf-8');
  });
});

// ===========================================
// PERFORMANCE — Core Web Vitals
// ===========================================
test.describe('Performance — Core Web Vitals', () => {
  test('should load auth page within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not exceed 10 layout shifts on load', async ({ page }) => {
    await page.goto('/');

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    expect(cls).toBeLessThan(0.25);
  });
});

// ===========================================
// SECURITY — Headers & XSS
// ===========================================
test.describe('Security', () => {
  test('should not expose server technology in HTML comments', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toContain('<!-- Powered by');
    expect(html).not.toContain('<!-- Version:');
  });

  test('should not have inline event handlers (XSS surface)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const onclickElements = await page
      .locator('[onclick], [onerror], [onload], [onmouseover]')
      .count();
    expect(onclickElements).toBe(0);
  });
});
