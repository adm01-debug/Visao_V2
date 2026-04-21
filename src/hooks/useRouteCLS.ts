/**
 * useRouteCLS - Reseta o monitor CLS a cada mudança de rota e
 * dispara um snapshot final 3s após "load completo" (heurística:
 * sem queries em fetching no React Query).
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import {
  resetForRoute,
  markFinalReport,
  getRouteSnapshot,
} from '@/lib/clsMonitor';
import { trackEvent } from '@/lib/analytics';

export function useRouteCLS(): void {
  const location = useLocation();
  const isFetching = useIsFetching();

  useEffect(() => {
    resetForRoute(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (isFetching > 0) return;
    const timer = window.setTimeout(() => {
      const snap = getRouteSnapshot();
      trackEvent('cls.route', snap);
      markFinalReport();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [isFetching, location.pathname]);
}
