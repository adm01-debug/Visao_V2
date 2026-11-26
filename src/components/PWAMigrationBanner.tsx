/**
 * VISÃO - PWA Migration Banner
 *
 * Detecta resíduos do antigo PWA (service workers e caches Workbox/VISÃO)
 * e orienta o usuário a recarregar para limpar caches stale.
 * Mostra apenas uma vez — usuário pode dispensar.
 */
import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { STORAGE_KEYS } from '@/constants/app';

const STALE_CACHE_PREFIXES = ['workbox-', 'visao-', 'precache-'];
const DISMISS_KEY = STORAGE_KEYS.PWA_MIGRATION_DISMISSED ?? 'visao_pwa_migration_dismissed_v1';
// Service worker push-only registrado por src/main.tsx — não é resíduo do PWA antigo.
const APP_SW_PATH = '/sw.js';

export function PWAMigrationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const detectAndCleanup = async () => {
      try {
        if (typeof window === 'undefined') return;
        if (localStorage.getItem(DISMISS_KEY) === '1') return;

        let hasResidue = false;

        // 1. Service workers alheios ao app (o push-only em APP_SW_PATH é legítimo)
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          const foreign = regs.filter((r) => {
            const url = r.active?.scriptURL ?? r.waiting?.scriptURL ?? r.installing?.scriptURL;
            if (!url) return true;
            try {
              return new URL(url).pathname !== APP_SW_PATH;
            } catch {
              return true;
            }
          });
          if (foreign.length > 0) {
            hasResidue = true;
            await Promise.all(foreign.map((r) => r.unregister().catch(() => false)));
          }
        }

        // 2. Caches (Workbox/PWA)
        if ('caches' in window) {
          const keys = await caches.keys();
          const stale = keys.filter((k) => STALE_CACHE_PREFIXES.some((p) => k.startsWith(p)));
          if (stale.length > 0) {
            hasResidue = true;
            await Promise.all(stale.map((k) => caches.delete(k).catch(() => false)));
          }
        }

        if (!cancelled && hasResidue) {
          setShow(true);
        }
      } catch {
        // silencioso: detecção é best-effort
      }
    };

    void detectAndCleanup();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="px-4 md:px-6 pt-4" role="status" aria-live="polite">
      <Alert className="border-warning/40 bg-warning/5">
        <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <AlertTitle>Atualização do sistema</AlertTitle>
            <AlertDescription>
              O modo offline foi desativado nesta versão. Recarregue a página para remover caches
              antigos e garantir que você está vendo a versão mais recente.
            </AlertDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={handleReload}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Recarregar agora
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} aria-label="Dispensar aviso">
              <X className="h-4 w-4" aria-hidden="true" />
              Dispensar
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}

export default PWAMigrationBanner;
