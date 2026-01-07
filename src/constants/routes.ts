export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  CAMERAS: '/cameras',
  CAMERA_DETAIL: '/cameras/:id',
  ALERTS: '/alerts',
  RECORDINGS: '/recordings',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  ZONES: '/zones',
  PERSONS: '/persons',
  VEHICLES: '/vehicles',
  AUTOMATION_RULES: '/automation-rules',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type Route = typeof ROUTES[RouteKey];
