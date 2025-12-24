import { logger } from "@/lib/logger";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ErrorBoundary
 * 
 * Captura erros em componentes filhos e exibe fallback amigável
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', { error, errorInfo });
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Algo deu errado</CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado. Nossa equipe foi notificada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details (collapsible for debugging) */}
              {this.state.error && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Detalhes técnicos
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-32">
                    <code className="text-xs text-destructive">
                      {this.state.error.message}
                    </code>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack.slice(0, 500)}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={this.handleRetry}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={this.handleGoHome}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir para o início
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={this.handleReload}
              >
                Recarregar página
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for ErrorBoundary with reset on route change
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Hook-like component for error boundary
 */
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallbackRender?: (props: { error: Error | null; resetError: () => void }) => ReactNode;
}

export function ErrorBoundaryWrapper({ children, fallbackRender }: ErrorBoundaryWrapperProps) {
  const [key, setKey] = React.useState(0);

  const handleReset = () => {
    setKey(prev => prev + 1);
  };

  return (
    <ErrorBoundary
      key={key}
      fallback={
        fallbackRender ? (
          <ErrorBoundaryFallbackRenderer 
            fallbackRender={fallbackRender} 
            onReset={handleReset}
          />
        ) : undefined
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Helper component for custom fallback rendering
function ErrorBoundaryFallbackRenderer({
  fallbackRender,
  onReset,
}: {
  fallbackRender: (props: { error: Error | null; resetError: () => void }) => ReactNode;
  onReset: () => void;
}) {
  const [error] = React.useState<Error | null>(null);
  return <>{fallbackRender({ error, resetError: onReset })}</>;
}

export default ErrorBoundary;
