/**
 * VISÃO - Detecção heurística de sobreposição de conteúdo pela BottomNav.
 *
 * Diferente de `mobile-nav-padding.spec.ts` (mede paddingBottom) e
 * `mobile-nav-overlap.spec.ts` (snapshot visual), este spec faz uma
 * varredura GEOMÉTRICA de TODOS os elementos interativos visíveis
 * (botões, links, inputs, cards clicáveis, headings, parágrafos com texto)
 * dentro do viewport e verifica se algum tem `bottom > navTop`, indicando
 * sobreposição real percebida pelo usuário.
 *
 * **Algoritmo:**
 * 1. Localiza a BottomNav (`[data-bottom-nav]` ou `nav` com fixed bottom).
 * 2. Calcula `navTop = navRect.top` (linha superior da nav).
 * 3. Scrolla até o final da página.
 * 4. Coleta todos os elementos visíveis com role interativo OU texto significativo.
 * 5. Para cada um: se `rect.bottom > navTop` E `rect.top < navTop` → OVERLAP.
 * 6. Falha listando seletores e textos dos primeiros 5 elementos sobrepostos.
 *
 * **Tolerância:** 4px de fuzz para arredondamento subpixel + sombras.
 *
 * **Cobertura:** rotas mobile mais críticas (alto volume de conteúdo interativo).
 *
 * Run: `npm run test:mobile-nav-content-overlap`
 */
import { test, expect, devices, type Page } from '@playwright/test';
import { gotoAuthenticated } from './helpers/authSession';

const CRITICAL_ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/heatmap',
  '/analytics',
  '/recordings',
  '/people',
  '/license-plate',
  '/zones',
  '/settings',
] as const;

const OVERLAP_TOLERANCE_PX = 4;

test.use({ ...devices['iPhone 12'] });

interface OverlapFinding {
  tag: string;
  text: string;
  selector: string;
  rectBottom: number;
  navTop: number;
  overlapPx: number;
}

async function detectOverlaps(page: Page, tolerance: number): Promise<{
  navTop: number | null;
  navFound: boolean;
  scanned: number;
  overlaps: OverlapFinding[];
}> {
  return await page.evaluate((tol) => {
    // 1. Localiza BottomNav
    const navCandidates = [
      document.querySelector('[data-bottom-nav]'),
      ...Array.from(document.querySelectorAll('nav')).filter((n) => {
        const cs = getComputedStyle(n);
        const r = n.getBoundingClientRect();
        return (cs.position === 'fixed' || cs.position === 'sticky') &&
               r.bottom >= window.innerHeight - 8 &&
               r.height > 40;
      }),
    ].filter(Boolean) as HTMLElement[];

    const nav = navCandidates[0];
    if (!nav) return { navTop: null, navFound: false, scanned: 0, overlaps: [] };

    const navRect = nav.getBoundingClientRect();
    const navTop = navRect.top;

    // 2. Coleta candidatos: interativos + texto visível
    const SELECTOR =
      'button, a[href], input, select, textarea, [role="button"], [role="link"], ' +
      '[role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"]), ' +
      'h1, h2, h3, p, li, td, [data-card], [data-interactive]';
    const all = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));

    const overlaps: OverlapFinding[] = [];
    let scanned = 0;

    for (const el of all) {
      // Ignora elementos dentro da própria nav
      if (nav.contains(el)) continue;

      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;

      const r = el.getBoundingClientRect();
      // Filtra invisíveis ou fora do viewport vertical
      if (r.width < 4 || r.height < 4) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;

      scanned++;

      // Detecta overlap: elemento cruza a linha superior da nav
      const crossesNavTop = r.bottom > navTop + tol && r.top < navTop;
      if (!crossesNavTop) continue;

      // Gera seletor curto identificável
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
        : '';
      const selector = `${el.tagName.toLowerCase()}${id}${cls}`;
      const text = (el.textContent || '').trim().slice(0, 60);

      overlaps.push({
        tag: el.tagName.toLowerCase(),
        text,
        selector,
        rectBottom: Math.round(r.bottom),
        navTop: Math.round(navTop),
        overlapPx: Math.round(r.bottom - navTop),
      });
    }

    return { navTop: Math.round(navTop), navFound: true, scanned, overlaps };
  }, tolerance);
}

test.describe('Mobile nav — sobreposição visual de conteúdo (heurístico)', () => {
  for (const route of CRITICAL_ROUTES) {
    test(`${route} — nenhum elemento interativo/texto coberto pela BottomNav`, async ({ page }) => {
      const ready = await gotoAuthenticated(page, route, { waitUntil: 'domcontentloaded' });
      if (!ready) return;

      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForSelector('[data-app-scroll]', { timeout: 10000 }).catch(() => {});

      // Scrolla até o fim para expor o último elemento real (caso de pior cenário)
      await page.evaluate(() => {
        const scroll = document.querySelector('[data-app-scroll]') as HTMLElement | null;
        if (scroll) scroll.scrollTop = scroll.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(400); // estabiliza animações de scroll

      const result = await detectOverlaps(page, OVERLAP_TOLERANCE_PX);

      // Diagnóstico estruturado em caso de falha
      const sample = result.overlaps.slice(0, 5);
      const message =
        `[mobile-nav-content-overlap] ${route}\n` +
        `  navFound=${result.navFound} navTop=${result.navTop}px\n` +
        `  scanned=${result.scanned} elementos\n` +
        `  overlaps=${result.overlaps.length} (tolerância ${OVERLAP_TOLERANCE_PX}px)\n` +
        (sample.length
          ? `  primeiros sobrepostos:\n` +
            sample
              .map(
                (o, i) =>
                  `    ${i + 1}. <${o.tag}> "${o.text}" → ${o.selector} ` +
                  `(bottom=${o.rectBottom}, navTop=${o.navTop}, overlap=${o.overlapPx}px)`,
              )
              .join('\n')
          : '');

      expect(result.navFound, `${route}: BottomNav não encontrada no DOM`).toBe(true);
      expect(result.overlaps.length, message).toBe(0);
    });
  }
});
