/**
 * LazyComponent - Lazy loading wrapper with suspense
 */

import React, { Suspense, ComponentType, lazy, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyComponentProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  delay?: number;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const DefaultErrorFallback = () => (
  <div className="flex items-center justify-center p-8 text-destructive">
    Erro ao carregar componente
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentProps = {}
) {
  const LazyComp = lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    const [hasError, setHasError] = useState(false);
    const [showFallback, setShowFallback] = useState(!!options.delay);

     useEffect(() => {
      if (options.delay) {
        const timer = setTimeout(() => setShowFallback(false), options.delay);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, []);

    if (hasError) {
      return <>{options.errorFallback || <DefaultErrorFallback />}</>;
    }

    if (showFallback) {
      return <>{options.fallback || <DefaultFallback />}</>;
    }

    return (
      <Suspense fallback={options.fallback || <DefaultFallback />}>
        <ErrorBoundary onError={() => setHasError(true)}>
          <LazyComp {...props} />
        </ErrorBoundary>
      </Suspense>
    );
  };
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Pre-built lazy components
export const LazyDashboard = createLazyComponent(() => import('@/pages/DashboardV2'));
export const LazyAlerts = createLazyComponent(() => import('@/pages/AlertsPage'));
export const LazyAnalytics = createLazyComponent(() => import('@/pages/AnalyticsPage'));
export const LazySettings = createLazyComponent(() => import('@/pages/SettingsPage'));

export default createLazyComponent;
