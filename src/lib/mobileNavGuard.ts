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
const REQUIRED_CLASS = 'mb-mobile-nav';

/**
 * Rotas standalone (NÃO renderizam BottomNavigation, logo NÃO precisam de
 * `mb-mobile-nav`). Espelha `ALLOWLIST` em `scripts/check-mobile-nav.mjs`.
 */
const STANDALONE_ROUTE_PATTERNS: RegExp[] = [
  /^\/auth(\/|$|\?)/,
  /^\/login(\/|$|\?)/,
  /^\/reset-password(\/|$|\?)/,
  /^\/acesso-negado(\/|$|\?)/,
  /^\/$/,
];

function isStandaloneRoute(path: string): boolean {
  return STANDALONE_ROUTE_PATTERNS.some((re) => re.test(path));
}

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
    if (el.hasAttribute(SCROLL_OWNER_ATTR)) return; // scroll oficial do app
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

/** Conjunto de rotas já reportadas como missing-class (evita spam por re-render). */
const reportedMissingClass = new Set<string>();

/**
 * Verifica presença literal da classe `mb-mobile-nav` dentro do scroll
 * container `[data-app-scroll]`. Se ausente em rota autenticada e em viewport
 * mobile, registra ERRO (logger.error) — esta é a violação primária do contrato.
 *
 * Roda em qualquer viewport (não só mobile) porque o efeito visual só aparece
 * em mobile, mas a classe deve existir SEMPRE para que o desenvolvedor pegue
 * a regressão também em desktop antes de subir o PR.
 *
 * Retorna `true` quando o contrato está OK (classe presente OU rota standalone
 * OU `<main>` ainda não montado — caso em que o caller deve aguardar).
 */
function checkRequiredClass(route: string): { ok: boolean; mounted: boolean } {
  if (isStandaloneRoute(route)) return { ok: true, mounted: true };

  const scroll = document.querySelector(`[${SCROLL_OWNER_ATTR}]`);
  if (!scroll) return { ok: true, mounted: false };

  const elements = scroll.querySelectorAll('*');
  for (const el of Array.from(elements)) {
    const cls = el.getAttribute('class') ?? '';
    if (cls.split(/\s+/).includes(REQUIRED_CLASS)) return { ok: true, mounted: true };
  }

  if (!reportedMissingClass.has(route)) {
    reportedMissingClass.add(route);
    const lastChild = scroll.lastElementChild as HTMLElement | null;
    logger.error(
      `[mobileNavGuard] Página autenticada SEM classe "${REQUIRED_CLASS}" no DOM`,
      {
        route,
        scanned: elements.length,
        lastChildTag: lastChild?.tagName.toLowerCase() ?? null,
        lastChildClass: lastChild?.getAttribute('class') ?? null,
        fix:
          `Aplicar a classe "${REQUIRED_CLASS}" no <main> do MainLayout ou no wrapper ` +
          `customizado da página. Veja docs/PAGE_CONTENT_STANDARD.md e ` +
          `mem://standards/mobile-nav-checklist (Camada 4 — script estático). ` +
          `Para silenciar intencionalmente em rota standalone, ajuste STANDALONE_ROUTE_PATTERNS.`,
      },
    );
  }
  return { ok: false, mounted: true };
}

function runGuard(route: string): void {
  // 1. Checagem primária: classe `mb-mobile-nav` deve existir no DOM
  checkRequiredClass(route);

  // 2. Checagem secundária (apenas mobile): scroll containers próprios sem padding
  if (window.innerWidth >= MOBILE_BREAKPOINT_PX) return;
  const offenders = scanForOffenders();
  if (offenders.length === 0) return;
  logger.warn('[mobileNavGuard] Container(s) com scroll próprio sem padding mobile detectado(s)', {
    route,
    count: offenders.length,
    offenders,
    fix: `Aplicar classe "${REQUIRED_CLASS}" (>= ${MIN_BOTTOM_PADDING_PX}px) ou data-allow-no-mobile-nav-padding para silenciar intencionalmente.`,
  });
}

let installed = false;
let earlyObserver: MutationObserver | null = null;

/**
 * Aguarda o `<main>` (ou `[data-app-scroll]`) ser montado e dispara o guard
 * IMEDIATAMENTE — antes do `load` event completar — para detectar a violação
 * já no primeiro paint do DEV. Cancela após primeira checagem ou timeout (5s).
 */
function installEarlyMountObserver(): void {
  if (earlyObserver) return;
  const route = window.location.pathname;
  if (isStandaloneRoute(route)) return;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    earlyObserver?.disconnect();
    earlyObserver = null;
  };

  // Já montado? roda agora.
  if (document.querySelector(`[${SCROLL_OWNER_ATTR}]`)) {
    runGuard(route);
    finish();
    return;
  }

  earlyObserver = new MutationObserver(() => {
    const result = checkRequiredClass(route);
    if (result.mounted) {
      // Roda check completo (incluindo offenders) e encerra observação inicial
      runGuard(route);
      finish();
    }
  });
  earlyObserver.observe(document.body, { childList: true, subtree: true });

  // Failsafe: para de escutar após 5s para não vazar listener.
  window.setTimeout(finish, 5000);
}

/**
 * Instala o guard. Idempotente. No-op em produção.
 * Chamar uma única vez no bootstrap (main.tsx).
 *
 * Em DEV, dispara duas verificações:
 *   1. EARLY (via MutationObserver no body): detecta a falta de `mb-mobile-nav`
 *      assim que o `<main>` é montado, ANTES do `load` event completar — útil
 *      para pegar regressões já no primeiro paint do hot-reload.
 *   2. POST-LOAD (após cada navegação SPA + load + resize): re-roda o check
 *      completo (classe + scroll containers órfãos).
 */
export function installMobileNavGuard(): void {
  if (installed) return;
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  installed = true;

  // Checagem precoce — antes do load completar
  if (document.body) installEarlyMountObserver();
  else document.addEventListener('DOMContentLoaded', installEarlyMountObserver, { once: true });

  const trigger = () => {
    // Limpa cache de "missing class" quando muda de rota
    reportedMissingClass.clear();
    // Aguarda paint para medir layout estabilizado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => runGuard(window.location.pathname));
    });
  };

  // Rodada pós-load (complementa a EARLY)
  if (document.readyState === 'complete') trigger();
  else window.addEventListener('load', trigger, { once: true });

  // Detecta mudanças de rota (pushState/replaceState/popstate)
  const wrap = (method: 'pushState' | 'replaceState') => {
    const original = history[method];
    history[method] = function (...args: Parameters<typeof original>) {
      const result = original.apply(this, args);
      // Re-instala observer para nova rota (pega missing-class antes do paint)
      installEarlyMountObserver();
      trigger();
      return result;
    };
  };
  wrap('pushState');
  wrap('replaceState');
  window.addEventListener('popstate', () => {
    installEarlyMountObserver();
    trigger();
  });

  // Reage a mudança de viewport (rotação)
  window.addEventListener('resize', trigger);
}
