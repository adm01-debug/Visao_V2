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

/** Rotas autenticadas que devem renderizar o wrapper com `mb-mobile-nav`. */
const AUTHENTICATED_ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/alerts-timeline',
  '/heatmap',
  '/analytics',
  '/settings',
  '/telegram',
  '/users',
  '/license-plates',
  '/face-recognition',
  '/productivity',
  '/journey-reports',
  '/panic-events',
  '/behavior-detection',
  '/evaluation',
  '/recordings',
  '/zones',
  '/people',
  '/ppe',
  '/admin/telemetria',
] as const;

const REQUIRED_CLASS = 'mb-mobile-nav';
const ALLOW_AUTH_SKIP = process.env.MOBILE_NAV_CLASS_AUTH_BYPASS === '1';

test.use({ ...devices['iPhone 12'] });

test.describe('Build gate: presença de mb-mobile-nav no DOM (mobile)', () => {
  for (const route of AUTHENTICATED_ROUTES) {
    test(`${route} renderiza wrapper com classe \`${REQUIRED_CLASS}\``, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response, `falha ao carregar ${route}`).toBeTruthy();

      // Aguarda um curto período para auth/redirect estabilizar
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

      const url = page.url();
      const redirectedToAuth = /\/(auth|login)(\?|#|$|\/)/.test(url);

      if (redirectedToAuth) {
        if (ALLOW_AUTH_SKIP) {
          test.skip(
            true,
            `Rota ${route} redirecionou para auth — skip controlado via MOBILE_NAV_CLASS_AUTH_BYPASS=1. ` +
              `Cobertura estática garantida por scripts/check-mobile-nav.mjs.`,
          );
          return;
        }
        throw new Error(
          `[mobile-nav-class] Rota ${route} redirecionou para ${url}. ` +
            `Configure auth-bypass de teste ou setApMOBILE_NAV_CLASS_AUTH_BYPASS=1 para permitir skip controlado.`,
        );
      }

      // O wrapper canônico precisa estar montado
      const scrollContainer = await page.waitForSelector('[data-app-scroll]', {
        timeout: 8000,
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
          `(ver mem://standards/mobile-nav-checklist e docs/PAGE_CONTENT_STANDARD.md).`,
      ).toBe(true);
    });
  }
});
