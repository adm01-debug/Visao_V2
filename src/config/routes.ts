import { ROUTES } from '@/constants/routes';

export const ROUTE_CONFIG = {
  publicRoutes: [ROUTES.LOGIN, ROUTES.REGISTER],
  protectedRoutes: [ROUTES.DASHBOARD, ROUTES.CAMERAS, ROUTES.ALERTS, ROUTES.RECORDINGS, ROUTES.SETTINGS],
  defaultRedirect: ROUTES.DASHBOARD,
  loginRedirect: ROUTES.LOGIN,
};

export const isPublicRoute = (path: string): boolean => ROUTE_CONFIG.publicRoutes.includes(path as string[]);
