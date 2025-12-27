/**
 * CodeSplitBoundary - Error boundary for code splitting
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  retryable?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class CodeSplitBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    console.error('[CodeSplit] Chunk load failed:', error);
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h3 className="text-lg font-semibold">Erro ao carregar</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {this.state.error?.message?.includes('chunk') 
              ? 'Falha ao carregar recursos. Verifique sua conexão.'
              : 'Ocorreu um erro inesperado.'}
          </p>
          {this.props.retryable !== false && (
            <Button onClick={this.handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          )}
          {this.state.retryCount >= 3 && (
            <Button onClick={() => window.location.reload()} variant="destructive">
              Recarregar página
            </Button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default CodeSplitBoundary;
