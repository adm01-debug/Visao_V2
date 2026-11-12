import type { ReactNode } from 'react';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/** Envolve o elemento de uma rota no RouteErrorBoundary (arquivo próprio para o Fast Refresh). */
export const withRouteErrorBoundary = (element: ReactNode, routeName?: string) => (
  <RouteErrorBoundary routeName={routeName}>{element}</RouteErrorBoundary>
);
