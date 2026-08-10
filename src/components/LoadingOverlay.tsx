import React, { memo } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const LoadingOverlay = memo(({ loading, children, message }: LoadingOverlayProps) => {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50">
          <LoadingSpinner size="lg" />
          {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';
