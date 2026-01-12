import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ isLoading, children, message, className }: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  );
}

export default LoadingOverlay;
