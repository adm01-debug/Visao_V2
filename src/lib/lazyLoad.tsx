/**
 * Lazy Loading Configuration
 * Optimizes bundle size by code-splitting routes
 */
import React, { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { SkeletonErrorBoundary } from '@/components/skeletons/SkeletonErrorBoundary';
import type { SkeletonFallbackVariant } from '@/components/skeletons/SkeletonFallback';
import { shouldSimulateSkeletonFailure } from '@/lib/skeletonFailureFlag';

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

export function withLazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingFallback />,
  boundaryName = 'withLazyLoad',
  fallbackVariant: SkeletonFallbackVariant = 'page',
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <SkeletonErrorBoundary
        boundaryName={`${boundaryName}:outer`}
        fallbackVariant={fallbackVariant}
      >
        <Suspense
          fallback={
            <SkeletonErrorBoundary
              boundaryName={`${boundaryName}:fallback`}
              fallbackVariant={fallbackVariant}
            >
              {fallback}
            </SkeletonErrorBoundary>
          }
        >
          <LazyComponent {...props} />
        </Suspense>
      </SkeletonErrorBoundary>
    );
  };
}

/**
 * Wraps an importFn so that, when the debug flag is set for the given scope,
 * the dynamic import REJECTS — exercising the SkeletonErrorBoundary fallback.
 */
function withFailureSimulation<T>(
  importFn: () => Promise<T>,
  scope: 'cameras' | 'alerts' | 'zones' | 'global',
): () => Promise<T> {
  return () => {
    if (shouldSimulateSkeletonFailure(scope)) {
      return Promise.reject(
        new Error(`[debug] simulated lazy chunk failure for "${scope}"`),
      );
    }
    return importFn();
  };
}

/**
 * Lazy-loaded page components
 */
export const LazyPages = {
  Dashboard: lazy(withFailureSimulation(() => import('@/pages/DashboardV2'), 'global')),
  Cameras: lazy(withFailureSimulation(() => import('@/pages/CamerasPage'), 'cameras')),
  Alerts: lazy(withFailureSimulation(() => import('@/pages/AlertsPage'), 'alerts')),
  Zones: lazy(withFailureSimulation(() => import('@/pages/ZonesPage'), 'zones')),
  Analytics: lazy(withFailureSimulation(() => import('@/pages/AnalyticsPage'), 'global')),
  Settings: lazy(withFailureSimulation(() => import('@/pages/SettingsPage'), 'global')),
};

export default LazyPages;
