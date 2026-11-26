/**
 * E2E — All 12 Authenticated Routes + Mobile Nav State
 * ----------------------------------------------------
 * Validações executadas em cada uma das 12 rotas autenticadas, em
 * desktop (1280×720) e mobile (iPhone 12, 390×844):
 *
 *   1. Layout autenticado montou (`[data-app-scroll]`)
 *   2. Heading H1 presente e não vazio
 *   3. Nenhum `SectionErrorBoundary` disparou
 *   4. Sem `console.error` legítimo
 *   5. Sem respostas HTTP 5xx
 *
 * Validações específicas mobile (somente iPhone 12):
 *   6. `<nav aria-label="Navegação principal mobile">` (BottomNav) visível
 *   7. BottomNav `position: fixed` e ancorada ao bottom (rect.bottom ≈ vh)
 *   8. `<main>` aplica `mb-mobile-nav` (padding-bottom > 56px)
 *   9. Último elemento interativo do conteúdo NÃO está sob a BottomNav
 *  10. Tap em categoria ativa abre o drawer (overlay + painel)
 *  11. Tap em backdrop fecha o drawer
 *  12. Estado do drawer é resetado entre navegações (não persiste)
 *
 * Como rodar:
 *   npm run test:auth-routes-mobile-nav
 *   E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... E2E_AUTH_REQUIRED=1 \
 *     npx playwright test auth-routes-mobile-nav
 *
 * Sem credenciais E2E_TEST_*, os testes fazem skip controlado via
 * `gotoAuthenticated` (cobertura garantida pelas camadas estáticas).
 */
import { devices, type Page } from '@playwright/test';
import { test, expect } from './helpers/testFixtures';
import { gotoAuthenticated } from './helpers/authSession';

// ---------------------------------------------------------------------------
// Catálogo de rotas autenticadas (sincronizado com docs/qa-checklist-template.md §1)
// ---------------------------------------------------------------------------
const AUTH_ROUTES: Array<{
  path: string;
  name: string;
  /** Heading H1 esperado (regex para tolerar variações). */
  heading: RegExp;
  /** Se true, tolera ausência de H1 estrito (página standalone customizada). */
  headingOptional?: boolean;
  /** Roles com acesso (apenas informativo — RBAC tratado por ProtectedRoute). */
  rbac?: string;
}> = [
  { path: '/dashboard', name: 'Dashboard', heading: /dashboard|monitoramento/i },
  { path: '/cameras', name: 'Cameras', heading: /câmeras|cameras/i },
  { path: '/alerts', name: 'Alerts', heading: /alertas|alerts/i },
  { path: '/heatmap', name: 'Heatmap', heading: /mapa de calor|heatmap/i },
  { path: '/analytics', name: 'Analytics', heading: /analytics|análise/i },
  { path: '/recordings', name: 'Recordings', heading: /gravações|recordings/i },
  { path: '/people', name: 'People', heading: /colaboradores|pessoas|people/i },
  { path: '/license-plate', name: 'LicensePlate', heading: /placas|license/i },
  { path: '/settings', name: 'Settings', heading: /configurações|settings/i },
  { path: '/users', name: 'Users', heading: /usuários|users/i, rbac: 'admin' },
  {
    path: '/notification-settings',
    name: 'NotificationSettings',
    heading: /notificaç|notification/i,
  },
  { path: '/zones', name: 'Zones', heading: /zonas|zones/i },
];

const CONSOLE_IGNORE = [
  /\[vite\]/i,
  /Download the React DevTools/i,
  /Lovable/i,
  /Failed to load resource.*favicon/i,
  /ResizeObserver loop/i,
  // A CSP de index.html restringe media-src a 'self' blob: https:; as câmeras
  // demo usam rtsp:// e o bloqueio é proposital (mesmo filtro de
  // smoke-pages.spec.ts e smoke-client-navigation.spec.ts).
  // Só o rtsp:// de demonstração: a mensagem traz a URL antes da
  // diretiva, então exigir `rtsp:` na mesma linha impede que um vídeo
  // HTTPS bloqueado pela CSP passe silencioso pelo check de console.
  /rtsp:\/\/.*violates the following Content Security Policy directive.*media-src/i,
  /Loading media from .*rtsp:\/\//i,
];

// Strip defaultBrowserType — test.use({ defaultBrowserType }) is forbidden inside
// describe blocks (forces a new worker). We keep all viewport/touch/UA settings.
const { defaultBrowserType: _dbt, ...iPhoneMobileNavConfig } = devices['iPhone 12'];

const BOTTOM_NAV_SELECTOR = 'nav[aria-label="Navegação principal mobile"]';
const DRAWER_PANEL_SELECTOR = '[data-testid="bottom-nav-drawer"]';
const DRAWER_BACKDROP_SELECTOR = 'div.fixed.inset-0';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface ConsoleCapture {
  errors: string[];
  network5xx: string[];
}

function attachCapture(page: Page): ConsoleCapture {
  const cap: ConsoleCapture = { errors: [], network5xx: [] };
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (CONSOLE_IGNORE.some((rx) => rx.test(text))) return;
    cap.errors.push(text);
  });
  page.on('response', (resp) => {
    if (resp.status() >= 500) {
      cap.network5xx.push(`${resp.status()} ${resp.url()}`);
    }
  });
  return cap;
}

async function assertCommonRouteHealth(
  page: Page,
  route: (typeof AUTH_ROUTES)[number],
  cap: ConsoleCapture
): Promise<void> {
  // 1. Layout autenticado montou
  await expect(
    page.locator('[data-app-scroll]'),
    `Layout autenticado não montou em ${route.path}`
  ).toBeVisible({ timeout: 10000 });

  // 2. H1 presente
  if (!route.headingOptional) {
    const h1 = page.locator('main h1').first();
    await expect(h1, `H1 não encontrado em ${route.path}`).toBeVisible({
      timeout: 8000,
    });
    await expect(h1, `H1 não casa em ${route.path}`).toContainText(route.heading);
  }

  // 3. Nenhum error boundary
  await expect(
    page.getByText(/algo deu errado|erro ao carregar/i),
    `ErrorBoundary disparou em ${route.path}`
  ).toHaveCount(0);

  // Aguarda estabilização para capturar erros tardios
  await page.waitForTimeout(400);

  // 4. Console limpo
  expect(cap.errors, `Console errors em ${route.path}:\n${cap.errors.join('\n')}`).toHaveLength(0);

  // 5. Sem 5xx
  expect(
    cap.network5xx,
    `Network 5xx em ${route.path}:\n${cap.network5xx.join('\n')}`
  ).toHaveLength(0);
}

// ===========================================================================
// SUITE 1 — Desktop (1280×720): saúde básica das 12 rotas
// ===========================================================================
test.describe('All Auth Routes — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  for (const route of AUTH_ROUTES) {
    test(`${route.name} (${route.path}) carrega sem erros`, async ({ page }) => {
      const cap = attachCapture(page);
      const ready = await gotoAuthenticated(page, route.path, {
        waitUntil: 'domcontentloaded',
      });
      if (!ready) return;

      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      await assertCommonRouteHealth(page, route, cap);

      // Desktop NÃO deve mostrar BottomNav (md:hidden)
      const bottomNav = page.locator(BOTTOM_NAV_SELECTOR);
      const bnVisible = await bottomNav.isVisible().catch(() => false);
      expect(bnVisible, `BottomNav não deveria aparecer em desktop em ${route.path}`).toBe(false);
    });
  }
});

// ===========================================================================
// SUITE 2 — Mobile iPhone 12 (390×844): saúde + BottomNav + estado mobile
// ===========================================================================
test.describe('All Auth Routes — Mobile (iPhone 12)', () => {
  test.use(iPhoneMobileNavConfig);

  for (const route of AUTH_ROUTES) {
    test(`${route.name} (${route.path}) — saúde + BottomNav + padding`, async ({ page }) => {
      const cap = attachCapture(page);
      const ready = await gotoAuthenticated(page, route.path, {
        waitUntil: 'domcontentloaded',
      });
      if (!ready) return;

      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      await assertCommonRouteHealth(page, route, cap);

      // 6. BottomNav visível
      const bottomNav = page.locator(BOTTOM_NAV_SELECTOR);
      await expect(bottomNav, `BottomNav ausente em ${route.path} (mobile)`).toBeVisible({
        timeout: 5000,
      });

      // 7. BottomNav fixa no rodapé
      const navGeometry = await bottomNav.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          position: cs.position,
          viewportH: window.innerHeight,
        };
      });
      expect(navGeometry.position).toBe('fixed');
      expect(
        Math.abs(navGeometry.bottom - navGeometry.viewportH),
        `BottomNav não ancorada no bottom em ${route.path}: ${JSON.stringify(navGeometry)}`
      ).toBeLessThanOrEqual(2);

      // 8. <main> aplica mb-mobile-nav (padding-bottom suficiente para esconder
      //    a barra). O token mb-mobile-nav resolve para ~5rem (80px) em mobile.
      const mainPadding = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return null;
        const cs = window.getComputedStyle(main);
        return {
          paddingBottom: parseFloat(cs.paddingBottom),
          marginBottom: parseFloat(cs.marginBottom),
          classes: main.className,
        };
      });
      expect(mainPadding, `<main> não encontrado em ${route.path}`).not.toBeNull();
      const totalSpacing = (mainPadding!.paddingBottom || 0) + (mainPadding!.marginBottom || 0);
      expect(
        totalSpacing,
        `<main> sem espaçamento inferior suficiente em ${route.path} (got ${totalSpacing}px, expected ≥56)`
      ).toBeGreaterThanOrEqual(56);

      // 9. Último elemento interativo do conteúdo NÃO está sob a BottomNav.
      //    Com a barra fixa, cards passam por baixo dela DURANTE o scroll — o
      //    que precisa valer é o fim da rolagem: o padding inferior de <main>
      //    tem de revelar o último interativo acima da barra.
      const scrollToBottom = () =>
        page.evaluate(() => {
          const scroller = document.querySelector('[data-app-scroll]');
          if (scroller) scroller.scrollTop = scroller.scrollHeight;
        });
      await scrollToBottom();
      await page.waitForTimeout(300);
      await scrollToBottom();
      const overlap = await page.evaluate((navTop) => {
        const vh = window.innerHeight;
        const candidates = Array.from(
          document.querySelectorAll('main button, main a, main input, main [role="button"]')
        ).filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          return (
            r.width > 0 &&
            r.height > 0 &&
            r.bottom > 0 &&
            r.top < vh &&
            cs.visibility !== 'hidden' &&
            cs.display !== 'none'
          );
        });
        if (candidates.length === 0) return null;
        // O interativo mais BAIXO visivel, nao o ultimo no DOM: com listas
        // virtualizadas/paginadas o ultimo no do DOM fica fora do viewport e a
        // `bottom` geometrica dele acusava overlap que ninguem enxerga.
        const last = candidates.reduce<HTMLElement>(
          (acc, el) =>
            (el as HTMLElement).getBoundingClientRect().bottom > acc.getBoundingClientRect().bottom
              ? (el as HTMLElement)
              : acc,
          candidates[0] as HTMLElement
        );
        const r = last.getBoundingClientRect();
        return {
          tag: last.tagName,
          text: (last.textContent || '').trim().slice(0, 60),
          bottom: r.bottom,
          navTop,
          overlapPx: Math.max(0, r.bottom - navTop),
        };
      }, navGeometry.top);

      if (overlap) {
        expect(
          overlap.overlapPx,
          `Último interativo coberto pela BottomNav em ${route.path}: ${JSON.stringify(overlap)}`
        ).toBeLessThanOrEqual(4);
      }
    });
  }
});

// ===========================================================================
// SUITE 3 — Estado do drawer mobile não regride entre rotas
// ===========================================================================
test.describe('Mobile Drawer State — não regride com mudanças', () => {
  test.use(iPhoneMobileNavConfig);

  test('drawer abre, fecha por backdrop e reseta ao navegar', async ({ page }) => {
    const cap = attachCapture(page);

    // Começa em /dashboard
    const ready = await gotoAuthenticated(page, '/dashboard', {
      waitUntil: 'domcontentloaded',
    });
    if (!ready) return;
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});

    const bottomNav = page.locator(BOTTOM_NAV_SELECTOR);
    await expect(bottomNav).toBeVisible();

    // Localiza categoria ativa (item com aria-current ou estilo destacado).
    // Fallback: primeiro botão do nav.
    const activeCategory = bottomNav.locator('button[aria-current="page"]').first();
    const targetButton = (await activeCategory.count())
      ? activeCategory
      : bottomNav.locator('button').first();
    await expect(targetButton).toBeVisible();

    // 10. Tap abre drawer
    await targetButton.tap();
    const drawer = page.locator(DRAWER_PANEL_SELECTOR).first();
    await expect(drawer, 'Drawer não abriu após tap em categoria ativa').toBeVisible({
      timeout: 3000,
    });

    // 11. Tap em backdrop fecha
    const backdrop = page.locator(DRAWER_BACKDROP_SELECTOR).first();
    if (await backdrop.isVisible().catch(() => false)) {
      // Tap em coordenada fora do painel (canto superior)
      await page.mouse.click(20, 80);
      await expect(drawer, 'Drawer não fechou ao tocar no backdrop').toBeHidden({ timeout: 3000 });
    } else {
      // Fallback: re-tap na categoria fecha
      await targetButton.tap();
      await expect(drawer).toBeHidden({ timeout: 3000 });
    }

    // 12. Estado do drawer reseta ao navegar para outra rota
    await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    await expect(
      page.locator(DRAWER_PANEL_SELECTOR).first(),
      'Drawer ficou aberto após navegar para /alerts'
    ).toBeHidden({ timeout: 3000 });

    // BottomNav ainda visível na nova rota
    await expect(bottomNav, 'BottomNav sumiu após navegação').toBeVisible();

    // Sanity: nenhum erro durante a sequência
    expect(cap.errors, `Console errors:\n${cap.errors.join('\n')}`).toHaveLength(0);
  });
});
