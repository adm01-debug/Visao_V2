/**
 * SkeletonErrorBoundary - Captura erros de render em skeletons branded e
 * em componentes lazy, exibindo um SkeletonFallback genérico para evitar
 * tela em branco. Loga via logger.error com:
 *   - rota atual (window.location.pathname + search)
 *   - nome do componente skeleton/lazy que falhou (extraído da componentStack)
 *   - label opcional do boundary
 */
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
import { SkeletonFallback, type SkeletonFallbackVariant } from './SkeletonFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
  /** Identificador opcional para indicar QUAL boundary capturou (ex.: "withLazyLoad:Cameras"). */
  boundaryName?: string;
  /** Variante do SkeletonFallback genérico quando `fallback` não é fornecido. */
  fallbackVariant?: SkeletonFallbackVariant;
}

interface State {
  hasError: boolean;
}

/**
 * Extrai o primeiro componente "interessante" da componentStack do React.
 * A stack vem no formato:
 *   "\n    at MyComp (...)\n    at Suspense\n    at div\n..."
 * Ignora primitivos (div/span/etc.) e wrappers comuns (Suspense, Boundary).
 */
function extractFailingComponent(componentStack: string | null | undefined): string | null {
  if (!componentStack) return null;
  const SKIP =
    /^(Suspense|SkeletonErrorBoundary|Anonymous|Fragment|div|span|main|section|button|ul|li|p|a|svg|path|g|h\d|tr|td|tbody|thead|table)$/i;
  const lines = componentStack.split('\n');
  for (const raw of lines) {
    const m = raw.match(/at\s+([A-Za-z_$][\w$]*)/);
    const name = m?.[1];
    if (!name) continue;
    if (SKIP.test(name)) continue;
    return name;
  }
  return null;
}

function getCurrentRoute(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    return `${window.location.pathname}${window.location.search}`;
  } catch {
    return 'unknown';
  }
}

export class SkeletonErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const route = getCurrentRoute();
    const failingComponent = extractFailingComponent(info.componentStack) ?? 'unknown';
    const boundaryName = this.props.boundaryName ?? 'SkeletonErrorBoundary';

    logger.error(
      `Skeleton render failed on "${route}" → component "${failingComponent}"; using generic fallback`,
      {
        route,
        failingComponent,
        boundaryName,
        boundaryLabel: this.props.label ?? null,
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      },
      'SkeletonErrorBoundary'
    );

    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.error(
        `[SkeletonErrorBoundary] route=${route} component=${failingComponent} boundary=${boundaryName}`,
        error,
        info
      );
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <SkeletonFallback label={this.props.label} variant={this.props.fallbackVariant} />
        )
      );
    }
    return this.props.children;
  }
}

export default SkeletonErrorBoundary;
