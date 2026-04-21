/**
 * Lazy Loading Configuration
 * Optimizes bundle size by code-splitting routes
 */
import React, { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { SkeletonErrorBoundary } from '@/components/skeletons/SkeletonErrorBoundary';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withLazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <SkeletonErrorBoundary>
        <Suspense
          fallback={<SkeletonErrorBoundary>{fallback}</SkeletonErrorBoundary>}
        >
          <LazyComponent {...props} />
        </Suspense>
      </SkeletonErrorBoundary>
    );
  };
}

/**
 * Lazy-loaded page components
 */
export const LazyPages = {
  Dashboard: lazy(() => import('@/pages/DashboardV2')),
  Cameras: lazy(() => import('@/pages/CamerasPage')),
  Alerts: lazy(() => import('@/pages/AlertsPage')),
  Zones: lazy(() => import('@/pages/ZonesPage')),
  Analytics: lazy(() => import('@/pages/AnalyticsPage')),
  Settings: lazy(() => import('@/pages/SettingsPage')),
};

export default LazyPages;
