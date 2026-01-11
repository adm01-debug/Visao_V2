/**
 * Lazy Loading Configuration
 * Optimizes bundle size by code-splitting routes
 */
import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading fallback component
 */
export const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

/**
 * Full page loading fallback
 */
export const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

/**
 * Wrapper for lazy-loaded components with Suspense
 */
export function withLazyLoad<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy-loaded page components
 */
export const LazyPages = {
  Dashboard: lazy(() => import('@/pages/Dashboard')),
  Cameras: lazy(() => import('@/pages/CamerasPage')),
  Alerts: lazy(() => import('@/pages/AlertsPage')),
  Zones: lazy(() => import('@/pages/ZonesPage')),
  Analytics: lazy(() => import('@/pages/AnalyticsPage')),
  Settings: lazy(() => import('@/pages/SettingsPage')),
  Recognition: lazy(() => import('@/pages/RecognitionPage')),
  Blacklist: lazy(() => import('@/pages/BlacklistPage')),
};

export default LazyPages;
