import React, { Suspense, memo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  loading?: boolean;
}

export const PageWrapper = memo(({ children, title, loading }: PageWrapperProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <div role="main" aria-label={title || 'Página'}>
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
});

PageWrapper.displayName = 'PageWrapper';
