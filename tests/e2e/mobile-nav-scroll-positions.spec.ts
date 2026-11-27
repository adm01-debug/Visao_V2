/**
 * VISÃO E2E — Mobile Nav overlap em múltiplas posições de scroll.
 *
 * Diferencial: enquanto `mobile-nav-overlap`, `mobile-nav-content-overlap` e
 * `mobile-nav-measured-overlap` validam apenas o estado final do scroll
 * (`scrollTop = scrollHeight`), este spec varre TRÊS posições — topo (0%),
 * meio (50%) e fim (100%) — para capturar elementos `position: sticky/fixed/
 * absolute`, FABs, banners flutuantes e modais inline que cobrem conteúdo
 * apenas em scroll parcial e desaparecem da viewport no fim.
 *
 * Algoritmo por (rota × posição):
 *   1. gotoAuthenticated + estabiliza render
 *   2. Mede scrollHeight real do `[data-app-scroll]` (fallback `window`)
 *   3. Posiciona scroll no offset alvo
 *   4. Aguarda 350ms para virtual lists / animações
 *   5. Mede altura dinâmica da BottomNav (helper compartilhado)
 *   6. Coleta elementos visíveis (interativos + texto significativo)
 *   7. Falha listando os 5 piores overlaps com tolerância de 4px
 */
import { test, expect } from './helpers/testFixtures';
import { EFFECTIVE_RECT_SRC } from './helpers/visibleClip';
import { gotoAuthenticated } from './helpers/authSession';
import { measureBottomNav } from './helpers/measureBottomNav';
import { waitForLayoutStable } from './helpers/waitLayoutStable';

const ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/alerts-timeline',
  '/heatmap',
  '/analytics',
  '/recordings',
  '/people',
] as const;

type ScrollPosition = 'top' | 'middle' | 'bottom';
const POSITIONS: readonly ScrollPosition[] = ['top', 'middle', 'bottom'] as const;
const OVERLAP_TOLERANCE_PX = 4;

interface OverlapItem {
  tag: string;
  text: string;
  selector: string;
  bottom: number;
  overlap: number;
}

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
}

test.describe('mobile-nav-scroll-positions — overlap em topo/meio/fim', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    for (const pos of POSITIONS) {
      test(`${route} @ scroll=${pos} — sem overlap com BottomNav`, async ({ page }) => {
        const ok = await gotoAuthenticated(page, route, { waitUntil: 'domcontentloaded' });
        if (!ok) return;

        // Estabilização inicial: cards crescem quando os dados chegam, e medir
        // antes disso captura geometria intermediaria (conteudo em bottom=539
        // ou botao fixed fora da viewport) que nao existe no estado final.
        await waitForLayoutStable(page);

        // Posiciona o scroll no offset alvo e captura métricas.
        // Lazy lists/graficos crescem DEPOIS da primeira rolagem (scrollHeight
        // mudou de 1246 para mais enquanto mediamos), entao o alvo precisa ser
        // reaplicado ate o scrollTop convergir. Sem isso, `bottom` ficava em
        // 459/1246 e acusava conteudo em fluxo que ainda era alcancavel.
        const applyScroll = (position: ScrollPosition): Promise<ScrollMetrics> =>
          page.evaluate((position: ScrollPosition): ScrollMetrics => {
            const container = document.querySelector<HTMLElement>('[data-app-scroll]');
            const vh = window.innerHeight;

            if (container) {
              const sh = container.scrollHeight;
              // O viewport útil do container é o próprio clientHeight: usar
              // window.innerHeight subestimava o maxTop (header e safe-area), então
              // a posição `bottom` nunca alcançava o fim real do conteúdo.
              const maxTop = Math.max(0, sh - container.clientHeight);
              const target =
                position === 'top' ? 0 : position === 'middle' ? Math.floor(maxTop / 2) : maxTop;
              container.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
              return { scrollTop: container.scrollTop, scrollHeight: sh, viewportHeight: vh };
            }

            const sh = document.documentElement.scrollHeight;
            const maxTop = Math.max(0, sh - vh);
            const target =
              position === 'top' ? 0 : position === 'middle' ? Math.floor(maxTop / 2) : maxTop;
            window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
            return { scrollTop: window.scrollY, scrollHeight: sh, viewportHeight: vh };
          }, position);

        let metrics = await applyScroll(pos);
        let converged = false;
        // Virtual lists/lazy renders/animações podem crescer com o scroll. O
        // /analytics monta KPIs e graficos por blocos e reflui a grade varias
        // vezes; com 3 tentativas mediamos o topo enquanto ainda faltavam ~800px
        // de conteudo abaixo e acusavamos overlap de fluxo que o usuario revela
        // rolando. Agora: mais tentativas + exige scrollTop E scrollHeight
        // estaveis em duas leituras seguidas.
        for (let attempt = 0; attempt < 10; attempt += 1) {
          await waitForLayoutStable(page, { timeout: 2000 });
          const retry = await applyScroll(pos);
          converged =
            Math.abs(retry.scrollTop - metrics.scrollTop) <= 1 &&
            retry.scrollHeight === metrics.scrollHeight;
          metrics = retry;
          if (converged) break;
        }

        // Se ainda nao convergiu, falha com mensagem explicita em vez de medir
        // geometria intermediaria e reportar sobreposicao inexistente.
        expect(
          converged,
          `[mobile-nav-scroll-positions] ${route} @ ${pos} - conteudo nao ` +
            `estabilizou (scrollTop=${metrics.scrollTop}/${metrics.scrollHeight}); ` +
            `medicao seria instavel.`
        ).toBe(true);
        await waitForLayoutStable(page, { timeout: 2000 });

        // `waitForLayoutStable` acima pode ver o conteudo crescer DEPOIS da
        // convergencia (grafico termina de desenhar). Sem revalidar, a medicao
        // roda com o scroll ja fora do fim e acusa overlap de fluxo alcancavel.
        metrics = await applyScroll(pos);
        const noFim =
          Math.abs(metrics.scrollTop - metrics.scrollHeight) <= 2 ||
          (await page.evaluate(() => {
            const c = document.querySelector<HTMLElement>('[data-app-scroll]');
            if (!c)
              return (
                Math.abs(
                  window.scrollY - (document.documentElement.scrollHeight - window.innerHeight)
                ) <= 2
              );
            return Math.abs(c.scrollTop - (c.scrollHeight - c.clientHeight)) <= 2;
          }));
        expect(
          pos !== 'bottom' || noFim,
          `[mobile-nav-scroll-positions] ${route} @ bottom - scroll nao chegou ao fim ` +
            `(scrollTop=${metrics.scrollTop}/${metrics.scrollHeight}); ` +
            `elementos medidos nao estao cobertos de forma permanente.`
        ).toBe(true);

        const nav = await measureBottomNav(page);
        expect(
          nav.found,
          `[mobile-nav-scroll-positions] BottomNav não encontrada em "${route}" @ ${pos}.`
        ).toBe(true);

        const overlaps = await page.evaluate(
          ({
            navTop,
            tol,
            clipSrc,
            pos,
          }: {
            navTop: number;
            tol: number;
            clipSrc: string;
            pos: ScrollPosition;
          }): OverlapItem[] => {
            const effectiveRect = new Function('return ' + clipSrc.trim())() as (
              el: Element,
              viewportHeight: number
            ) => { top: number; bottom: number; height: number; width: number; visible: boolean };
            const vh = window.innerHeight;
            const selector =
              'button, a, input, textarea, select, [role="button"], h1, h2, h3, p, li, td, [role="link"]';
            const els = Array.from(document.querySelectorAll<HTMLElement>(selector));

            // Computa um seletor curto para diagnóstico.
            const describe = (el: HTMLElement): string => {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : '';
              const cls =
                el.classList.length > 0 ? `.${Array.from(el.classList).slice(0, 2).join('.')}` : '';
              const testid = el.getAttribute('data-testid');
              return testid ? `${tag}[data-testid="${testid}"]` : `${tag}${id}${cls}`;
            };

            const inNav = (el: HTMLElement): boolean =>
              !!el.closest(
                '[data-testid="bottom-navigation"], [data-bottom-nav], nav.fixed.bottom-0'
              );

            const items: OverlapItem[] = [];
            for (const el of els) {
              if (inNav(el)) continue;
              const r = el.getBoundingClientRect();
              if (r.width <= 4 || r.height <= 4) continue;
              // Apenas elementos visíveis na viewport atual.
              if (r.bottom <= 0 || r.top >= vh) continue;
              const cs = window.getComputedStyle(el);
              if (
                cs.visibility === 'hidden' ||
                cs.display === 'none' ||
                parseFloat(cs.opacity || '1') < 0.1
              )
                continue;
              // `r` é o rect bruto; o overlap precisa considerar o clipping dos
              // ancestrais, senão itens de cards com scroll interno acusam
              // sobreposição inexistente.
              // Conteudo em FLUXO de scroll passa sob a nav em scroll parcial
              // e e alcancavel rolando: nao e sobreposicao. `relative` continua
              // sendo fluxo (apenas pinta deslocado), entao entra na exclusao.
              // Este spec existe para sticky/fixed/absolute, FABs e banners que
              // cobrem conteudo sem o usuario poder revelar. No fim do scroll
              // nao ha o que rolar, entao tudo e verificado.
              if (pos !== 'bottom' && (cs.position === 'static' || cs.position === 'relative')) {
                continue;
              }

              const eff = effectiveRect(el, vh);
              if (!eff.visible) continue;
              const overlap = eff.bottom - navTop;
              if (overlap > tol) {
                const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
                items.push({
                  tag: el.tagName.toLowerCase(),
                  text,
                  selector: describe(el),
                  bottom: Math.round(eff.bottom * 10) / 10,
                  overlap: Math.round(overlap * 10) / 10,
                });
              }
            }
            // Ordena pelos piores overlaps primeiro.
            items.sort((a, b) => b.overlap - a.overlap);
            return items.slice(0, 5);
          },
          { navTop: nav.topPx, tol: OVERLAP_TOLERANCE_PX, clipSrc: EFFECTIVE_RECT_SRC, pos }
        );

        if (overlaps.length > 0) {
          const lines = overlaps
            .map(
              (o, i) =>
                `  ${i + 1}. <${o.tag}> "${o.text}" → ${o.selector} ` +
                `(bottom=${o.bottom}, overlap=${o.overlap}px)`
            )
            .join('\n');
          throw new Error(
            `[mobile-nav-scroll-positions] ${route} @ ${pos} ` +
              `(scrollTop=${metrics.scrollTop}/${metrics.scrollHeight}, vh=${metrics.viewportHeight})\n` +
              `  navTop=${nav.topPx.toFixed(1)}, navHeight=${nav.heightPx.toFixed(1)}, ` +
              `overlaps=${overlaps.length}\n${lines}`
          );
        }
      });
    }
  }
});
