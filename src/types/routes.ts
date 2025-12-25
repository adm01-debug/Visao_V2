export interface RouteDefinition { path: string; component: React.ComponentType; exact?: boolean; title?: string; icon?: string; permissions?: string[]; layout?: string; children?: RouteDefinition[]; }

export const ROUTE_PATHS = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CAMERAS: '/cameras',
  CAMERA_DETAIL: '/cameras/:id',
  ALERTS: '/alerts',
  RECORDINGS: '/recordings',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  USERS: '/users',
  REPORTS: '/reports',
  NOT_FOUND: '/404',
} as const;

export type RoutePath = typeof ROUTE_PATHS[keyof typeof ROUTE_PATHS];
export const buildPath = (path: string, params: Record<string, string>): string => Object.entries(params).reduce((p, [key, value]) => p.replace(\`:$\{key}\`, value), path);
