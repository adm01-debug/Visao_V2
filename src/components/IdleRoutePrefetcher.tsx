import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLikelyNext, prefetchRoute, isSlowConnection } from '@/lib/routePrefetch';
import { initViewportPrefetch } from '@/lib/viewportPrefetch';

/**
 * Warmup em idle das rotas mais prováveis a partir da rota atual + auto-prefetch
 * de links visíveis no viewport (via IntersectionObserver).
 * - Executa via `requestIdleCallback` (fallback: `setTimeout`).
 * - Pula em conexões lentas / saveData.
 * - Reavalia a cada mudança de rota.
 * Monte uma vez dentro do `<BrowserRouter>` para ativar globalmente.
 */
export function IdleRoutePrefetcher(): null {
  const { pathname } = useLocation();

  // Inicializa observer de viewport uma única vez (idempotente).
  useEffect(() => {
    if (isSlowConnection()) return;
    return initViewportPrefetch();
  }, []);

  useEffect(() => {
    if (isSlowConnection()) return;
    const targets = getLikelyNext(pathname);
    if (targets.length === 0) return;

    const ric =
      (
        window as unknown as {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 250));
    const cic =
      (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback ??
      window.clearTimeout;

    const id = ric(
      () => {
        for (const path of targets) prefetchRoute(path);
      },
      { timeout: 2000 }
    );

    return () => cic(id);
  }, [pathname]);

  return null;
}
