/**
 * VISÃO - Granular Error Boundary for layout sections
 * Branded recovery UI with helpful guidance
 */
import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  section: string;
  fallbackClassName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  showDetails: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[VISÃO][${this.props.section}] Error:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-8 text-center',
            this.props.fallbackClassName
          )}
          role="alert"
          aria-live="assertive"
        >
          {/* Branded error icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
            </div>
            <Shield
              className="absolute -bottom-1 -right-1 h-5 w-5 text-primary/30"
              aria-hidden="true"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Erro em {this.props.section}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Algo inesperado aconteceu. Tente recarregar esta seção.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, showDetails: false })}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Tentar novamente
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="gap-1 text-muted-foreground"
              aria-expanded={this.state.showDetails}
              aria-controls="error-details"
            >
              {this.state.showDetails ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Detalhes
            </Button>
          </div>

          {this.state.showDetails && (
            <pre
              id="error-details"
              className="mt-2 max-w-sm text-left text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-3 overflow-x-auto font-mono"
            >
              {this.state.error?.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
