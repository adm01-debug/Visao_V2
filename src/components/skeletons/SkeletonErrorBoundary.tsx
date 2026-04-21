/**
 * SkeletonErrorBoundary - Captura erros de render em skeletons branded e
 * em componentes lazy, exibindo um SkeletonFallback genérico para evitar
 * tela em branco. Loga via logger.error (e console.error em DEV).
 */
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
import { SkeletonFallback } from './SkeletonFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
}

export class SkeletonErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(
      'Skeleton render failed; using generic fallback',
      { message: error.message, stack: error.stack, componentStack: info.componentStack },
      'SkeletonErrorBoundary'
    );
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.error('[SkeletonErrorBoundary]', error, info);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <SkeletonFallback label={this.props.label} />;
    }
    return this.props.children;
  }
}

export default SkeletonErrorBoundary;
