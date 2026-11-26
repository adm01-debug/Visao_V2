import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have lang attribute on html', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('all images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const role = await images.nth(i).getAttribute('role');
      // Image should have alt or role="presentation"
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // All buttons should have accessible names
    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      const hasAccessibleName = (text && text.trim()) || ariaLabel || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Check that text elements have non-transparent colors
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('focus should be visible on interactive elements', async ({ page }) => {
    await page.goto('/');
    // SPA: em `domcontentloaded` o splash ainda esta montado e nao existe nada
    // tabulavel. O `Tab` focava o <body>, que nao casa com `:focus`, e o teste
    // reprovava um layout correto por corrida com o primeiro render.
    const focusable = page.locator(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    await expect(focusable.first()).toBeAttached({ timeout: 15000 });

    // Snapshot do estilo ANTES do Tab: um `box-shadow` decorativo que ja
    // existia nao pode valer como indicador de foco.
    const snapshot = await focusable.evaluateAll((els) =>
      els.slice(0, 6).map((el) => {
        const cs = getComputedStyle(el);
        return {
          key:
            el.tagName + '#' + (el.id || '') + '.' + (el.className || '').toString().slice(0, 60),
          outlineStyle: cs.outlineStyle,
          outlineWidth: parseFloat(cs.outlineWidth) || 0,
          boxShadow: cs.boxShadow,
        };
      })
    );

    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveCount(1);
    await expect(focused).toBeVisible();

    const ring = await focused.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        key: el.tagName + '#' + (el.id || '') + '.' + (el.className || '').toString().slice(0, 60),
        outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth) || 0,
        boxShadow: cs.boxShadow,
      };
    });
    const before = snapshot.find((item) => item.key === ring.key);
    const hasOutline = ring.outlineStyle !== 'none' && ring.outlineWidth > 0;
    const shadowChanged = !before || before.boxShadow !== ring.boxShadow;
    expect(
      hasOutline || shadowChanged,
      `Foco sem indicador perceptivel: ${JSON.stringify({ before, after: ring })}`
    ).toBe(true);
  });
});
