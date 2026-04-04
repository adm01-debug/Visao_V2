/**
 * VISÃO - Granular Error Boundary for layout sections
 */
import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode; section: string; fallbackClassName?: string }
interface State { hasError: boolean; error?: Error }

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.section}] Error:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`flex flex-col items-center justify-center gap-3 p-6 text-center ${this.props.fallbackClassName || ''}`}>
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-foreground">Erro em {this.props.section}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{this.state.error?.message}</p>
          <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false })}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
