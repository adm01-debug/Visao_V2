/**
 * Lazy-loaded route components for code splitting
 * Improves initial load time by loading routes on demand
 */
import { lazy } from 'react';

// Main Pages - Lazy loaded
export const LazyDashboard = lazy(() => import('@/pages/Dashboard'));
export const LazyCamerasPage = lazy(() => import('@/pages/CamerasPage'));
export const LazyAlertsPage = lazy(() => import('@/pages/AlertsPage'));
export const LazyZonesPage = lazy(() => import('@/pages/ZonesPage'));
export const LazySettingsPage = lazy(() => import('@/pages/SettingsPage'));
export const LazyReportsPage = lazy(() => import('@/pages/ReportsPage'));
export const LazyAnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
export const LazyUsersPage = lazy(() => import('@/pages/UsersPage'));
export const LazyIntegrationsPage = lazy(() => import('@/pages/IntegrationsPage'));
export const LazyLogsPage = lazy(() => import('@/pages/LogsPage'));

// Feature Pages - Lazy loaded
export const LazyRecognitionPage = lazy(() => import('@/pages/RecognitionPage'));
export const LazyBlacklistPage = lazy(() => import('@/pages/BlacklistPage'));
export const LazyAutomationPage = lazy(() => import('@/pages/AutomationPage'));
export const LazyClipsPage = lazy(() => import('@/pages/ClipsPage'));

// Admin Pages - Lazy loaded
export const LazyAdminPage = lazy(() => import('@/pages/AdminPage'));
export const LazyAuditPage = lazy(() => import('@/pages/AuditPage'));

/**
 * Loading fallback component for Suspense
 */
export const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

export default {
  LazyDashboard,
  LazyCamerasPage,
  LazyAlertsPage,
  LazyZonesPage,
  LazySettingsPage,
  LazyReportsPage,
  LazyAnalyticsPage,
  LazyUsersPage,
  LazyIntegrationsPage,
  LazyLogsPage,
  LazyRecognitionPage,
  LazyBlacklistPage,
  LazyAutomationPage,
  LazyClipsPage,
  LazyAdminPage,
  LazyAuditPage,
  RouteLoadingFallback,
};
