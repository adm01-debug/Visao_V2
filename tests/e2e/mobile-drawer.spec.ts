/**
 * VISÃO - E2E mobile drawer (BottomNavigation expandido por categoria).
 *
 * A BottomNavigation mobile expande um "drawer" inferior quando o usuário
 * toca uma categoria já ativa OU re-toca a categoria expandida (toggle).
 * Comportamentos validados (ver `src/components/BottomNavigation.tsx`):
 *
 *   1. Tap em categoria NÃO ativa → navega para `defaultPath`, drawer fechado.
 *   2. Tap em categoria ativa → drawer abre listando itens da categoria.
 *   3. Re-tap na mesma categoria expandida → drawer fecha.
 *   4. Tap no overlay (backdrop) → drawer fecha.
 *   5. Tap no botão X interno → drawer fecha.
 *   6. Tap em item do drawer → navega + drawer fecha automaticamente.
 *   7. Trocar de categoria com drawer aberto: navegação correta + estado limpo.
 *
 * Viewport: iPhone 12 (390×844).
 *
 * Run: `npm run test:mobile-drawer`.
 */
import { test, expect, devices } from '@playwright/test';
import { gotoAuthenticated } from './helpers/authSession';

// devices['iPhone 12'] traz defaultBrowserType: 'webkit', o que faria o projeto
// `chromium` abrir o WebKit (não instalado no CI). A intenção destas specs é
// viewport/UA/touch de iPhone — emulados no navegador do projeto.
const { defaultBrowserType: _dbt, ...iPhone12 } = devices['iPhone 12'];
test.use(iPhone12);

const NAV = 'nav[aria-label="Navegação principal mobile"]';
const DRAWER_HEADING = (label: string) => `text=/^${label}$/`;

/** Localiza o botão de categoria pelo aria-label (que inclui a label + badge). */
function categoryButton(page: import('@playwright/test').Page, label: string) {
  return page.locator(`${NAV} button[aria-label^="${label}"]`).first();
}

/** Drawer expandido — painel fixo acima da BottomNav com botão X. */
function drawerPanel(page: import('@playwright/test').Page) {
  return page.locator('div.fixed.bottom-16').first();
}

test.describe('Mobile drawer (BottomNavigation)', () => {
  test.beforeEach(async ({ page }) => {
    const ready = await gotoAuthenticated(page, '/dashboard', { waitUntil: 'domcontentloaded' });
    test.skip(!ready, 'Sessão autenticada indisponível — drawer requer rota auth.');
    await page.waitForSelector(NAV, { timeout: 10000 });
  });

  test('abre drawer ao tocar categoria ativa (Monitor) e fecha ao re-tocar', async ({ page }) => {
    // Em /dashboard, "Monitor" é a categoria ativa
    const monitor = categoryButton(page, 'Monitor');
    await expect(monitor).toBeVisible();
    await expect(monitor).toHaveAttribute('aria-current', 'page');

    // Tap → drawer abre
    await monitor.tap();
    await expect(drawerPanel(page)).toBeVisible();
    await expect(page.locator(`${DRAWER_HEADING('Monitor')}`).first()).toBeVisible();

    // Re-tap → drawer fecha
    await monitor.tap();
    await expect(drawerPanel(page)).toBeHidden();
  });

  test('navega ao tocar categoria diferente (drawer não abre)', async ({ page }) => {
    // De /dashboard (Monitor ativo) → tap em "Intel" deve navegar para /analytics
    await categoryButton(page, 'Intel').tap();
    await expect(page).toHaveURL(/\/analytics$/, { timeout: 5000 });
    await expect(drawerPanel(page)).toBeHidden();
  });

  test('drawer fecha ao tocar no overlay (backdrop)', async ({ page }) => {
    await categoryButton(page, 'Monitor').tap();
    await expect(drawerPanel(page)).toBeVisible();

    // Overlay = primeira motion.div fixed inset-0 com backdrop-blur
    const overlay = page.locator('div.fixed.inset-0.bg-background\\/80').first();
    await overlay.tap({ position: { x: 50, y: 50 } });
    await expect(drawerPanel(page)).toBeHidden();
  });

  test('drawer fecha ao tocar no botão X', async ({ page }) => {
    await categoryButton(page, 'Monitor').tap();
    const drawer = drawerPanel(page);
    await expect(drawer).toBeVisible();

    // Botão X dentro do drawer (único button no header do drawer)
    await drawer.locator('button:has(svg.lucide-x)').first().tap();
    await expect(drawer).toBeHidden();
  });

  test('navegar via item do drawer fecha o drawer e atualiza a rota', async ({ page }) => {
    // Abrir Monitor → tap em "Câmeras"
    await categoryButton(page, 'Monitor').tap();
    const drawer = drawerPanel(page);
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: /^Câmeras$/i }).tap();
    await expect(page).toHaveURL(/\/cameras$/, { timeout: 5000 });
    await expect(drawerPanel(page)).toBeHidden();

    // Após navegar, "Monitor" continua ativo (Câmeras pertence a Monitor)
    await expect(categoryButton(page, 'Monitor')).toHaveAttribute('aria-current', 'page');
  });

  test('trocar de categoria depois de abrir drawer mantém estado consistente', async ({ page }) => {
    // 1. Abre drawer Monitor
    await categoryButton(page, 'Monitor').tap();
    await expect(drawerPanel(page)).toBeVisible();

    // 2. Tap em outra categoria (Intel) — comportamento esperado:
    //    como Intel NÃO é ativa, navega para /analytics e fecha o drawer.
    await categoryButton(page, 'Intel').tap();
    await expect(page).toHaveURL(/\/analytics$/, { timeout: 5000 });
    await expect(drawerPanel(page)).toBeHidden();

    // 3. Agora "Intel" é a ativa → tap re-abre drawer dessa categoria
    await categoryButton(page, 'Intel').tap();
    const drawer = drawerPanel(page);
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: /^Analytics$/i })).toBeVisible();
  });

  test('drawer não cobre os botões da BottomNav (acessibilidade tátil)', async ({ page }) => {
    await categoryButton(page, 'Monitor').tap();
    const drawer = drawerPanel(page);
    await expect(drawer).toBeVisible();

    // Geometricamente: drawer.bottom <= nav.top (drawer fica ACIMA da nav)
    const geometry = await page.evaluate(() => {
      const drawer = document.querySelector('div.fixed.bottom-16') as HTMLElement | null;
      const nav = document.querySelector(
        'nav[aria-label="Navegação principal mobile"]'
      ) as HTMLElement | null;
      if (!drawer || !nav) return null;
      const d = drawer.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      return { drawerBottom: d.bottom, navTop: n.top };
    });

    expect(geometry, 'drawer ou nav não encontrados').not.toBeNull();
    // tolerância 2px para borders
    expect(geometry!.drawerBottom).toBeLessThanOrEqual(geometry!.navTop + 2);
  });
});
