/**
 * Viewport Prefetch — observa TODOS os `<a href="/...">` na página e dispara
 * `prefetchRoute()` quando entram no viewport. Complementa o prefetch em
 * `hover`/`focus` do Sidebar: cobre links em cards, tabelas, menus contextuais,
 * breadcrumbs, sem exigir refactor de cada componente.
 *
 * Estratégia:
 *   - Um único `IntersectionObserver` global (thin-margin de 200px para
 *     antecipar scroll rápido).
 *   - `MutationObserver` reobserva conforme a árvore muda (SPA render).
 *   - Ignora links externos, âncoras (`#`), links a arquivos, `mailto:`/`tel:`,
 *     e links com `data-no-prefetch`.
 *   - Respeita `saveData`/`slow-2g` via `prefetchRoute` (já filtra internamente).
 *   - Idempotente: após primeiro prefetch, unobserve.
 */
import { prefetchRoute } from "./routePrefetch";

const OBSERVED = new WeakSet<Element>();
let io: IntersectionObserver | null = null;
let mo: MutationObserver | null = null;

function isInternalRoute(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (url.origin !== window.location.origin) return false;
      return url.pathname.startsWith("/");
    } catch {
      return false;
    }
  }
  return href.startsWith("/") && !/\.[a-z0-9]{2,5}(\?|$)/i.test(href);
}

function extractPath(href: string): string {
  if (/^https?:\/\//i.test(href)) {
    try {
      return new URL(href).pathname;
    } catch {
      return "";
    }
  }
  return href.split("?")[0].split("#")[0];
}

function handleIntersect(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const el = entry.target as HTMLAnchorElement;
    const path = extractPath(el.getAttribute("href") ?? "");
    if (path) prefetchRoute(path);
    io?.unobserve(el);
  }
}

function scan(root: ParentNode = document) {
  const links = root.querySelectorAll<HTMLAnchorElement>('a[href]:not([data-no-prefetch])');
  for (const link of links) {
    if (OBSERVED.has(link)) continue;
    const href = link.getAttribute("href") ?? "";
    if (!isInternalRoute(href)) continue;
    OBSERVED.add(link);
    io?.observe(link);
  }
}

export function initViewportPrefetch(): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return () => {};
  }
  if (io) return () => {}; // já inicializado

  io = new IntersectionObserver(handleIntersect, {
    rootMargin: "200px 0px",
    threshold: 0.01,
  });

  scan();

  mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) scan(node as Element);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  return () => {
    io?.disconnect();
    mo?.disconnect();
    io = null;
    mo = null;
  };
}
