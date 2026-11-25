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

// Strip defaultBrowserType — test.use({ defaultBrowserType }) is forbidden inside
// describe blocks (forces a new worker). We keep all viewport/touch/UA settings.
const { defaultBrowserType: _dbt, ...iPhoneViewportConfig } = devices['iPhone 12'];

const VIEWPORTS = [
  { name: 'desktop', config: { viewport: { width: 1280, height: 720 } } },
  { name: 'mobile', config: iPhoneViewportConfig },
];

const CONSOLE_IGNORE = [
  /\[vite\]/i,
  /Download the React DevTools/i,
  /Lovable/i,
  /Failed to load resource.*favicon/i,
  // Cameras demo usam rtsp:// e a CSP de index.html restringe media-src a
  // 'self' blob: https:. O bloqueio e proposital, nao um defeito da navegacao.
  /violates the following Content Security Policy directive.*media-src/i,
  /Loading media from .*rtsp:\/\//i,
];

/**
 * Localiza o link de navegação para `step` usando estratégia em camadas.
 * Retorna null se nenhum candidato visível for encontrado.
 */
/**
 * Abre a categoria da sidebar que contem o destino.
 *
 * A sidebar e colapsavel e so a categoria da rota ativa nasce expandida —
 * `/heatmap` fica em "Inteligencia", que abre fechada a partir do Dashboard.
 * Sem abrir, o link nem existe no DOM e o teste reprovava com "link nao
 * encontrado" mesmo a navegacao funcionando.
 */
async function expandCategoryFor(page: Page, step: NavStep): Promise<void> {
  const alreadyVisible = page.locator(`a[href="${step.path}"]`).first();
  if (await alreadyVisible.isVisible().catch(() => false)) return;

  // Sidebar desktop: categorias sao collapsibles com aria-expanded. Iterar por
  // indice sobre um locator vivo abria sempre a categoria errada (a lista
  // encolhe ao expandir), entao cada categoria e localizada pelo proprio rotulo.
  // Em viewport mobile a sidebar vive num drawer sobreposto: mexer nela aqui
  // abriria um overlay que bloqueia o BottomNav, entao fica restrita ao desktop.
  const width = page.viewportSize()?.width ?? 1280;
  const usesOverlaySidebar = width < 768;
  if (!usesOverlaySidebar) {
    const sidebarLabels = [
      'Inteligência',
      'Intel',
      'Segurança',
      'Gestão',
      'Monitoramento',
      'Config',
    ];
    for (const label of sidebarLabels) {
      const trigger = page
        .locator(`aside [aria-expanded="false"]`, {
          hasText: new RegExp(`^\\s*${label}`, 'i'),
        })
        .first();
      if ((await trigger.count().catch(() => 0)) === 0) continue;
      await trigger.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      if (await alreadyVisible.isVisible().catch(() => false)) return;
    }
  }

  // BottomNav mobile: cada aba abre um drawer com os itens da categoria. Os
  // botoes nao expoem aria-expanded, entao clicamos por rotulo e conferimos o
  // alvo a cada tentativa. O drawer pode renderizar <button> (com
  // data-testid="nav-<id>") em vez de <a href>, por isso o alvo e o testId.
  // A Sidebar mobile tambem renderiza `nav-<id>` (oculta dentro do drawer
  // fechado), entao `.first()` casava com o item invisivel. Filtrar por
  // :visible evita concluir que o alvo ja esta acessivel.
  const target = step.testId
    ? page.locator(`[data-testid="${step.testId}"]:visible`).first()
    : null;
  const targetVisible = async (): Promise<boolean> => {
    if (await alreadyVisible.isVisible().catch(() => false)) return true;
    if (!target) return false;
    // O drawer do BottomNav entra com animacao spring; esperar o alvo ficar
    // visivel e mais confiavel do que um sleep fixo.
    await target.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    return (await target.count().catch(() => 0)) > 0;
  };
  const categoryLabels = [
    'Intel',
    'Inteligência',
    'Segurança',
    'Gestão',
    'Monitor',
    'Monitoramento',
    'Config',
    'Configurações',
  ];
  for (const label of categoryLabels) {
    const tab = page
      .locator('nav button', { hasText: new RegExp(`^\\s*${label}\\s*$`, 'i') })
      .first();
    if ((await tab.count().catch(() => 0)) === 0) continue;
    // Aba inativa navega para o caminho padrao da categoria em vez de abrir o
    // drawer (BottomNavigation.handleCategoryClick). Estando nela, o clique
    // seguinte abre o drawer com todos os itens — dai as 3 tentativas.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if ((await tab.count().catch(() => 0)) === 0) break;
      await tab
        .first()
        .click({ timeout: 3000 })
        .catch(() => {});
      await page.waitForTimeout(600);
      if (await targetVisible()) return;
    }
  }
}

async function findNavLink(page: Page, step: NavStep): Promise<Locator | null> {
  // 0. Categoria da sidebar pode estar colapsada (link fora do DOM).
  await expandCategoryFor(page, step);

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

  // 2b. Drawer do BottomNav mobile: botoes com data-testid, sem href.
  if (step.testId) {
    const byTestId = page.locator(`[data-testid="${step.testId}"]:visible`).first();
    if (await byTestId.isVisible().catch(() => false)) return byTestId;
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
async function clickAndAssertSPA(page: Page, link: Locator, step: NavStep): Promise<void> {
  // Marca a página atual com um sentinel — se sobreviver à navegação,
  // confirma que NÃO houve hard reload (foi transição client-side).
  await page.evaluate(() => {
    (window as unknown as { __spaSentinel?: number }).__spaSentinel = Date.now();
  });

  // A sidebar rola internamente: sem trazer ao viewport o clique estoura.
  await link.scrollIntoViewIfNeeded().catch(() => {});
  await link.click();

  // Aguarda URL mudar (sem timeout agressivo — algumas rotas têm splash)
  await page.waitForURL(`**${step.path}`, { timeout: 10000 });

  // Sentinel deve persistir = navegação SPA
  const sentinel = await page.evaluate(
    () => (window as unknown as { __spaSentinel?: number }).__spaSentinel
  );
  expect(
    sentinel,
    `Hard reload detectado ao navegar para ${step.path} — link deveria usar <Link> do React Router`
  ).toBeTruthy();

  // Heading da página de destino
  await expect(page.locator('[data-app-scroll]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('h1').first()).toContainText(step.heading, { timeout: 30_000 });

  // Nenhum error boundary
  await expect(page.getByText(/algo deu errado|erro ao carregar/i)).toHaveCount(0);
}

for (const vp of VIEWPORTS) {
  test.describe(`Navegação client-side (${vp.name})`, () => {
    test.use(vp.config);

    test('Dashboard → Heatmap → Analytics via menu', async ({ page }) => {
      // O Dashboard so monta o h1 depois que cameras+alerts respondem; com o
      // banco frio isso consome boa parte do timeout global de 60s, e o fluxo
      // mobile ainda abre o drawer do BottomNav duas vezes.
      test.setTimeout(180_000);
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

      await expect(page.locator('h1').first()).toContainText(/dashboard/i, { timeout: 45_000 });

      // Snapshot de loads após chegada — toda navegação SPA seguinte
      // NÃO deve incrementar este contador (apenas pushState).
      const baselineLoads = extraLoads;

      // Executa o fluxo: Dashboard → Heatmap → Analytics
      for (const step of NAV_FLOW) {
        const link = await findNavLink(page, step);
        expect(
          link,
          `Link de navegação para ${step.name} (${step.path}) não encontrado em ${vp.name}. ` +
            `Adicione data-testid="${step.testId}" para estabilizar este teste.`
        ).not.toBeNull();

        await clickAndAssertSPA(page, link!, step);
      }

      // Validação SPA: nenhuma navegação extra de documento após o baseline.
      // (framenavigated dispara também em pushState, mas em hard reload o
      // sentinel já teria sumido — esta é uma checagem complementar.)
      expect(
        extraLoads - baselineLoads,
        `Detectadas ${extraLoads - baselineLoads} navegações extras — algumas podem ser hard reloads`
      ).toBeLessThanOrEqual(NAV_FLOW.length * 2); // tolera pushState + replaceState

      // Sem erros de console / 5xx ao longo do fluxo
      expect(
        consoleErrors,
        `Console errors durante navegação:\n${consoleErrors.join('\n')}`
      ).toHaveLength(0);
      expect(
        networkErrors,
        `Network 5xx durante navegação:\n${networkErrors.join('\n')}`
      ).toHaveLength(0);
    });
  });
}
