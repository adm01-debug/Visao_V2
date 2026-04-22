/**
 * VISÃO - Runtime guard: detecta páginas que criam um container de scroll
 * próprio (overflow-y: auto/scroll) sem aplicar `mb-mobile-nav` ou padding-bottom
 * equivalente, o que faria a BottomNavigation cobrir conteúdo em mobile.
 *
 * Estratégia:
 * 1. Roda apenas em DEV (`import.meta.env.DEV`) e em viewport mobile (<768px).
 * 2. A cada navegação, varre elementos descendentes do `<main>` à procura de
 *    containers com scroll vertical próprio.
 * 3. Para cada container suspeito, verifica se possui padding-bottom suficiente
 *    (>= 64px) para acomodar a BottomNavigation (h-16).
 * 4. Loga um warning estruturado com o seletor do elemento ofensor e instruções
 *    de correção. Não quebra a app.
 *
 * O scroll oficial do app (`[data-app-scroll]` no MainLayout) é ignorado — esse
 * já recebe `mb-mobile-nav` no `<main>` filho via política central.
 *
 * Para silenciar intencionalmente (ex.: modal full-screen com backdrop próprio):
 *   <div data-allow-no-mobile-nav-padding>
 */

import { logger } from './logger';

const MOBILE_BREAKPOINT_PX = 768;
const MIN_BOTTOM_PADDING_PX = 64; // h-16 da BottomNavigation
const SCROLL_OWNER_ATTR = 'data-app-scroll';
const OPT_OUT_ATTR = 'data-allow-no-mobile-nav-padding';

interface OffenderInfo {
  selector: string;
  paddingBottom: number;
  className: string;
}

const reported = new WeakSet<Element>();

function getSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const cls = (el.className && typeof el.className === 'string')
    ? el.className.split(' ').filter(Boolean).slice(0, 3).join('.')
    : '';
  return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
}

function isScrollContainer(el: Element): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  if (overflowY !== 'auto' && overflowY !== 'scroll') return false;
  // Precisa ter realmente scroll (conteúdo > viewport do container)
  return el.scrollHeight > el.clientHeight + 1;
}

function hasOptOut(el: Element): boolean {
  return el.closest(`[${OPT_OUT_ATTR}]`) !== null;
}

function getEffectiveBottomPadding(el: Element): number {
  const style = window.getComputedStyle(el);
  const padding = parseFloat(style.paddingBottom) || 0;
  // Margin do último filho também conta como espaço
  const last = el.lastElementChild;
  if (!last) return padding;
  const lastStyle = window.getComputedStyle(last);
  const margin = parseFloat(lastStyle.marginBottom) || 0;
  return padding + margin;
}

function scanForOffenders(): OffenderInfo[] {
  const main = document.querySelector('main');
  if (!main) return [];

  const offenders: OffenderInfo[] = [];
  const candidates = main.querySelectorAll('div, section, article, aside, ul, ol');

  candidates.forEach((el) => {
    if (reported.has(el)) return;
    if (el.hasAttribute(SCROLL_OWNER_ATTR)) return; // scroll oficial
    if (el.closest(`[${SCROLL_OWNER_ATTR}]`) === el.closest(`[${SCROLL_OWNER_ATTR}]`) === null) {
      // dentro do scroll oficial — segue
    }
    if (hasOptOut(el)) return;
    if (!isScrollContainer(el)) return;

    const padding = getEffectiveBottomPadding(el);
    if (padding >= MIN_BOTTOM_PADDING_PX) return;

    reported.add(el);
    offenders.push({
      selector: getSelector(el),
      paddingBottom: padding,
      className: typeof el.className === 'string' ? el.className : '',
    });
  });

  return offenders;
}

function runGuard(route: string): void {
  if (window.innerWidth >= MOBILE_BREAKPOINT_PX) return;

  const offenders = scanForOffenders();
  if (offenders.length === 0) return;

  logger.warn('[mobileNavGuard] Container(s) com scroll próprio sem padding mobile detectado(s)', {
    route,
    count: offenders.length,
    offenders,
    fix: `Aplicar classe "mb-mobile-nav" (>= ${MIN_BOTTOM_PADDING_PX}px) ou data-allow-no-mobile-nav-padding para silenciar intencionalmente.`,
  });
}

let installed = false;

/**
 * Instala o guard. Idempotente. No-op em produção.
 * Chamar uma única vez no bootstrap (App.tsx ou main.tsx).
 */
export function installMobileNavGuard(): void {
  if (installed) return;
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  installed = true;

  const trigger = () => {
    // Aguarda paint para medir layout estabilizado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => runGuard(window.location.pathname));
    });
  };

  // Rodada inicial após DOM pronto
  if (document.readyState === 'complete') trigger();
  else window.addEventListener('load', trigger, { once: true });

  // Detecta mudanças de rota (pushState/replaceState/popstate)
  const wrap = (method: 'pushState' | 'replaceState') => {
    const original = history[method];
    history[method] = function (...args: Parameters<typeof original>) {
      const result = original.apply(this, args);
      trigger();
      return result;
    };
  };
  wrap('pushState');
  wrap('replaceState');
  window.addEventListener('popstate', trigger);

  // Reage a mudança de viewport (rotação)
  window.addEventListener('resize', trigger);
}
