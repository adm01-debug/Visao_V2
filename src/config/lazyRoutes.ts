/**
 * Lazy-loaded route components for code splitting
 */
import { lazy } from 'react';

// Main pages - lazy loaded
export const DashboardPage = lazy(() => import('@/pages/DashboardV2'));
export const CamerasPage = lazy(() => import('@/pages/CamerasPage'));
export const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
export const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
export const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
export const ZonesPage = lazy(() => import('@/pages/ZonesPage'));
export const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
export const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

// Loading fallback component
export { Suspense } from 'react';
