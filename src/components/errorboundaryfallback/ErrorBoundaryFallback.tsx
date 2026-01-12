import React from 'react';
import { cn } from '@/lib/utils';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryFallbackProps {
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ErrorBoundaryFallback({ error, onRetry, onGoHome, className }: ErrorBoundaryFallbackProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[400px] text-center p-8', className)}>
      <AlertOctagon className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-semibold mb-2">Algo deu errado</h1>
      <p className="text-muted-foreground mb-2">Ocorreu um erro inesperado. Por favor, tente novamente.</p>
      {error && (
        <details className="mb-4 text-left max-w-md">
          <summary className="cursor-pointer text-sm text-muted-foreground">Detalhes do erro</summary>
          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">{error.message}</pre>
        </details>
      )}
      <div className="flex gap-3">
        {onRetry && <Button variant="outline" onClick={onRetry}><RefreshCw className="h-4 w-4 mr-2" />Tentar Novamente</Button>}
        {onGoHome && <Button onClick={onGoHome}><Home className="h-4 w-4 mr-2" />Página Inicial</Button>}
      </div>
    </div>
  );
}

export default ErrorBoundaryFallback;
