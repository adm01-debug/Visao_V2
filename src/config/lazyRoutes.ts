/**
 * Lazy-loaded route components for code splitting
 * @description Improves initial load time by splitting code into chunks
 */
import { lazy } from 'react';

// Main pages - lazy loaded
export const DashboardPage = lazy(() => import('@/pages/Dashboard'));
export const CamerasPage = lazy(() => import('@/pages/CamerasPage'));
export const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
export const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
export const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
export const ZonesPage = lazy(() => import('@/pages/ZonesPage'));
export const UsersPage = lazy(() => import('@/pages/UsersPage'));
export const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
export const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage'));
export const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
export const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));

// Heavy components - lazy loaded
export const MapView = lazy(() => import('@/components/MapView'));
export const VideoPlayer = lazy(() => import('@/components/VideoPlayer'));
export const AnalyticsDashboard = lazy(() => import('@/components/AnalyticsDashboard'));
export const ClipGallery = lazy(() => import('@/components/ClipGallery'));

// Loading fallback component
export { Suspense } from 'react';
