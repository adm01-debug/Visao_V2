/**
 * Smoke tests — navegação client-side entre páginas autenticadas.
 *
 * Valida que a navegação via React Router (sem reload) funciona ao clicar
 * nos links reais da Sidebar (desktop) e BottomNavigation (mobile),
 * cobrindo o fluxo Dashboard → Heatmap → Analytics.
 *
 * **O que detecta:**
 *   - Quebra de rotas/aliases após refactor (ex.: link aponta para path
 *     inexistente, ProtectedRoute mal configurado).
 *   - Hard reload acidental (uso de <a href> em vez de <Link>) — verificado
 *     via flag de "mesma navegação SPA" (sem evento `load` extra).
 *   - SectionErrorBoundary disparando em transições.
 *   - Heading da página de destino não montou.
 *
 * **Diferença vs `smoke-pages.spec.ts`:**
 *   smoke-pages valida cada página isoladamente (goto direto). Este spec
 *   valida as TRANSIÇÕES — clicando nos links como um usuário real faria.
 *
 * **Estratégia de seleção de link:**
 *   1. Tenta `[data-testid="nav-{id}"]` (futuro padrão).
 *   2. Fallback: link com `href="{path}"` visível dentro de `nav, aside, [role="navigation"]`.
 *   3. Fallback final: link com texto do label (case-insensitive).
 *
 * Cobertura responsiva: desktop (Sidebar) + mobile (BottomNavigation).
 */
import { devices, type Page, type Locator } from '@playwright/test';
import { test, expect } from './helpers/testFixtures';
import { gotoAuthenticated } from './helpers/authSession';

interface NavStep {
  /** Path destino esperado após o clique. */
  path: string;
  /** Nome amigável para logs. */
  name: string;
  /** Regex do <h1> da página de destino. */
  heading: RegExp;
  /** Labels candidatos para localizar o link no menu (case-insensitive). */
  labels: string[];
  /** data-testid candidato (preferencial se existir). */
  testId?: string;
}

const NAV_FLOW: NavStep[] = [
  {
    path: '/heatmap',
    name: 'Heatmap',
    heading: /mapa de calor/i,
    labels: ['Calor', 'Mapa de Calor', 'Heatmap'],
    testId: 'nav-heatmap',
  },
  {
    path: '/analytics',
    name: 'Analytics',
    heading: /analytics|análise/i,
    labels: ['Analytics', 'Análise'],
    testId: 'nav-analytics',
  },
];

const VIEWPORTS = [
  { name: 'desktop', config: { viewport: { width: 1280, height: 720 } } },
  { name: 'mobile', config: { ...devices['iPhone 12'] } },
];

const CONSOLE_IGNORE = [
  /\[vite\]/i,
  /Download the React DevTools/i,
  /Lovable/i,
  /Failed to load resource.*favicon/i,
];

/**
 * Localiza o link de navegação para `step` usando estratégia em camadas.
 * Retorna null se nenhum candidato visível for encontrado.
 */
async function findNavLink(page: Page, step: NavStep): Promise<Locator | null> {
  // 1. data-testid (padrão futuro estável)
  if (step.testId) {
    const byTestId = page.locator(`[data-testid="${step.testId}"]`).first();
    if (await byTestId.isVisible().catch(() => false)) return byTestId;
  }

  // 2. href dentro de container de navegação (Sidebar/BottomNav)
  const navScopes = ['nav', 'aside', '[role="navigation"]'];
  for (const scope of navScopes) {
    const byHref = page.locator(`${scope} a[href="${step.path}"]`).first();
    if (await byHref.isVisible().catch(() => false)) return byHref;
  }

  // 3. Fallback por texto do label (qualquer link/botão visível)
  for (const label of step.labels) {
    const byText = page
      .locator(`a, button`, { hasText: new RegExp(`^\\s*${label}\\s*$`, 'i') })
      .first();
    if (await byText.isVisible().catch(() => false)) return byText;
  }

  return null;
}

/**
 * Clica no link e valida transição SPA (sem hard reload).
 * Retorna `true` se a transição completou com a URL e heading corretos.
 */
async function clickAndAssertSPA(
  page: Page,
  link: Locator,
  step: NavStep,
): Promise<void> {
  // Marca a página atual com um sentinel — se sobreviver à navegação,
  // confirma que NÃO houve hard reload (foi transição client-side).
  await page.evaluate(() => {
    (window as unknown as { __spaSentinel?: number }).__spaSentinel = Date.now();
  });

  await link.click();

  // Aguarda URL mudar (sem timeout agressivo — algumas rotas têm splash)
  await page.waitForURL(`**${step.path}`, { timeout: 10000 });

  // Sentinel deve persistir = navegação SPA
  const sentinel = await page.evaluate(
    () => (window as unknown as { __spaSentinel?: number }).__spaSentinel,
  );
  expect(
    sentinel,
    `Hard reload detectado ao navegar para ${step.path} — link deveria usar <Link> do React Router`,
  ).toBeTruthy();

  // Heading da página de destino
  await expect(page.locator('[data-app-scroll]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('h1').first()).toContainText(step.heading, { timeout: 10000 });

  // Nenhum error boundary
  await expect(page.getByText(/algo deu errado|erro ao carregar/i)).toHaveCount(0);
}

for (const vp of VIEWPORTS) {
  test.describe(`Navegação client-side (${vp.name})`, () => {
    test.use(vp.config);

    test('Dashboard → Heatmap → Analytics via menu', async ({ page }) => {
      const consoleErrors: string[] = [];
      const networkErrors: string[] = [];
      let extraLoads = 0;

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!CONSOLE_IGNORE.some((rx) => rx.test(text))) {
            consoleErrors.push(text);
          }
        }
      });
      page.on('response', (resp) => {
        if (resp.status() >= 500) {
          networkErrors.push(`${resp.status()} ${resp.url()}`);
        }
      });
      // Conta navegações de documento (cada hard reload incrementa)
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) extraLoads += 1;
      });

      // Ponto de partida: Dashboard autenticado
      const ready = await gotoAuthenticated(page, '/dashboard', {
        waitUntil: 'domcontentloaded',
      });
      if (!ready) return;

      await expect(page.locator('h1').first()).toContainText(/dashboard/i, { timeout: 10000 });

      // Snapshot de loads após chegada — toda navegação SPA seguinte
      // NÃO deve incrementar este contador (apenas pushState).
      const baselineLoads = extraLoads;

      // Executa o fluxo: Dashboard → Heatmap → Analytics
      for (const step of NAV_FLOW) {
        const link = await findNavLink(page, step);
        expect(
          link,
          `Link de navegação para ${step.name} (${step.path}) não encontrado em ${vp.name}. ` +
            `Adicione data-testid="${step.testId}" para estabilizar este teste.`,
        ).not.toBeNull();

        await clickAndAssertSPA(page, link!, step);
      }

      // Validação SPA: nenhuma navegação extra de documento após o baseline.
      // (framenavigated dispara também em pushState, mas em hard reload o
      // sentinel já teria sumido — esta é uma checagem complementar.)
      expect(
        extraLoads - baselineLoads,
        `Detectadas ${extraLoads - baselineLoads} navegações extras — algumas podem ser hard reloads`,
      ).toBeLessThanOrEqual(NAV_FLOW.length * 2); // tolera pushState + replaceState

      // Sem erros de console / 5xx ao longo do fluxo
      expect(
        consoleErrors,
        `Console errors durante navegação:\n${consoleErrors.join('\n')}`,
      ).toHaveLength(0);
      expect(
        networkErrors,
        `Network 5xx durante navegação:\n${networkErrors.join('\n')}`,
      ).toHaveLength(0);
    });
  });
}
