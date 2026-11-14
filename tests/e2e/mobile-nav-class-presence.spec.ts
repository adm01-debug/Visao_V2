/**
 * VISÃO - Build gate: presença literal de `mb-mobile-nav` no DOM
 *
 * Diferente de `mobile-nav-padding.spec.ts` (que mede `paddingBottom` computado
 * e PULA quando a rota redireciona para /auth), este spec é um **gate de build**:
 *
 * 1. Viewport mobile (iPhone 12).
 * 2. Para cada rota autenticada listada, navega e:
 *    a) Se redirecionar para /auth, FALHA com mensagem clara — todas as rotas
 *       devem estar acessíveis no preview de build (ou cobertas por bypass de
 *       teste). Isso garante cobertura real do contrato em runtime.
 *    b) Caso contrário, exige que EXISTA pelo menos um elemento descendente
 *       de `[data-app-scroll]` cuja `class` contenha LITERALMENTE a string
 *       `mb-mobile-nav`. Não basta o padding-bottom computado — a classe é
 *       a fonte canônica do contrato (única fonte de verdade documentada
 *       em `mem://standards/mobile-nav-checklist`).
 *
 * Runs em CI como gate obrigatório (sem `continue-on-error`). A falha quebra
 * o build, impedindo merge de páginas que esqueçam de aplicar o wrapper.
 *
 * Para rodar local: `npm run test:mobile-nav-class`.
 *
 * NOTA: Em CI sem credenciais de teste seedadas, o spec respeita a env var
 * `MOBILE_NAV_CLASS_AUTH_BYPASS=1` para skip controlado das rotas que exigem
 * auth — útil enquanto o setup de auth-bypass não está disponível. O check
 * estático (`scripts/check-mobile-nav.mjs`) já cobre essas rotas a nível de
 * código-fonte. SEM essa env var, qualquer redirect para /auth FALHA o build.
 */
import { test, expect, devices } from '@playwright/test';
import { gotoAuthenticated } from './helpers/authSession';
import { getAuthenticatedRoutesForSweep } from './helpers/discoverAuthRoutes';

/**
 * Lista derivada automaticamente de `src/App.tsx` (parsing estático de
 * `<Route>` envoltas em `ProtectedLayoutRoute`/`ProtectedRoute`).
 *
 * Adicionar uma nova rota protegida em `App.tsx` cobre este spec sem edição
 * manual. Ver `tests/e2e/helpers/discoverAuthRoutes.ts` para detalhes.
 */
const AUTHENTICATED_ROUTES = getAuthenticatedRoutesForSweep();

const REQUIRED_CLASS = 'mb-mobile-nav';

// devices['iPhone 12'] traz defaultBrowserType: 'webkit', o que faria o projeto
// `chromium` abrir o WebKit (não instalado no CI). A intenção destas specs é
// viewport/UA/touch de iPhone — emulados no navegador do projeto.
const { defaultBrowserType: _dbt, ...iPhone12 } = devices['iPhone 12'];
test.use(iPhone12);

test.describe('Build gate: presença de mb-mobile-nav no DOM (mobile)', () => {
  for (const route of AUTHENTICATED_ROUTES) {
    test(`${route} renderiza wrapper com classe \`${REQUIRED_CLASS}\``, async ({ page }) => {
      // Tenta autenticar via storage state ou login programático antes da navegação.
      // API pública do helper: navega e espera o SPA decidir entre montar
      // o scaffold autenticado OU redirecionar para /auth (Promise.race entre
      // `[data-app-scroll]` e a URL de login). Quando redireciona, o helper
      // faz skip controlado via MOBILE_NAV_CLASS_AUTH_BYPASS=1, ou lança o
      // erro de auth quando credenciais estão configuradas mas não valem.
      const ready = await gotoAuthenticated(page, route, {
        waitUntil: 'domcontentloaded',
        // Gate de build: sem MOBILE_NAV_CLASS_AUTH_BYPASS=1, redirect p/ /auth FALHA
        explicitBypassRequired: true,
      });
      expect(ready, `falha ao carregar ${route}`).toBeTruthy();
      if (!ready) return;

      // O wrapper canônico precisa estar montado
      const scrollContainer = await page.waitForSelector('[data-app-scroll]', {
        timeout: 30000,
      });
      expect(scrollContainer, `${route}: \`[data-app-scroll]\` não montado`).toBeTruthy();

      // Verifica presença LITERAL da classe no DOM dentro do scroll container
      const findings = await page.evaluate((requiredClass) => {
        const scroll = document.querySelector('[data-app-scroll]');
        if (!scroll) return { hasClass: false, elementCount: 0, lastChildClasses: '' };
        const all = scroll.querySelectorAll('*');
        let hasClass = false;
        for (const el of Array.from(all)) {
          const cls = el.getAttribute('class') || '';
          if (cls.split(/\s+/).includes(requiredClass)) {
            hasClass = true;
            break;
          }
        }
        const last = scroll.lastElementChild as HTMLElement | null;
        return {
          hasClass,
          elementCount: all.length,
          lastChildClasses: last?.getAttribute('class') ?? '',
        };
      }, REQUIRED_CLASS);

      expect(
        findings.hasClass,
        `[mobile-nav-class] ${route} NÃO contém nenhum elemento com a classe \`${REQUIRED_CLASS}\` ` +
          `dentro de \`[data-app-scroll]\` (${findings.elementCount} elementos varridos). ` +
          `Último filho do scroll container: "${findings.lastChildClasses}". ` +
          `Aplique \`${REQUIRED_CLASS}\` no <main> do MainLayout ou no wrapper customizado da página ` +
          `(ver mem://standards/mobile-nav-checklist e docs/PAGE_CONTENT_STANDARD.md).`
      ).toBe(true);
    });
  }
});
