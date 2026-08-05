import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { errorReporter } from '@/lib/errorReporter';

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`RouteErrorBoundary [${this.props.routeName || 'unknown'}]`, {
      error: error.message,
      stack: errorInfo.componentStack?.slice(0, 300),
    });
    errorReporter.captureComponentError(
      error,
      errorInfo.componentStack ?? undefined,
      this.props.routeName
    );
  }

  handleRetry = () => this.setState({ hasError: false, error: null });
  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-lg">Erro nesta página</CardTitle>
            <CardDescription>
              Ocorreu um erro ao carregar{' '}
              {this.props.routeName ? `"${this.props.routeName}"` : 'esta página'}. As demais
              páginas continuam funcionando normalmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {this.state.error && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs text-destructive overflow-auto max-h-24">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <Button variant="default" className="flex-1" onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
              <Button variant="outline" className="flex-1" onClick={this.handleGoHome}>
                <Home className="w-4 h-4 mr-2" />
                Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export const withRouteErrorBoundary = (element: ReactNode, routeName?: string) => (
  <RouteErrorBoundary routeName={routeName}>{element}</RouteErrorBoundary>
);
