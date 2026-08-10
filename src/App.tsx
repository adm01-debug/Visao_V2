import React, { Suspense, lazy, forwardRef } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SkeletonToggleProvider } from '@/contexts/SkeletonToggleContext';
import { SkeletonToggleButton } from '@/components/dev/SkeletonToggleButton';
import { SkeletonFailureToggleButton } from '@/components/dev/SkeletonFailureToggleButton';
import { MobileMenuChecklist } from '@/components/dev/MobileMenuChecklist';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SplashScreen } from '@/components/LoadingSpinner';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PanicButton } from '@/components/PanicButton';
import { TraceIdManager } from '@/components/TraceIdManager';
import { HistoryProvider } from '@/contexts/HistoryContext';
import { DynamicTitleManager } from '@/components/DynamicTitleManager';

import { withRouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { IdleRoutePrefetcher } from '@/components/IdleRoutePrefetcher';
import { CronStaleWatcher } from '@/components/admin/CronStaleWatcher';
import { errorReporter } from '@/lib/errorReporter';

// Install global error monitoring
errorReporter.installGlobalHandlers();

// DEV-only CLS debug badge (tree-shaken in prod via the env guard below)
const CLSBadge = import.meta.env.DEV
  ? lazy(() => import('@/components/debug/CLSBadge').then((m) => ({ default: m.CLSBadge })))
  : null;
const CLSShiftOverlay = import.meta.env.DEV
  ? lazy(() =>
      import('@/components/debug/CLSShiftOverlay').then((m) => ({ default: m.CLSShiftOverlay }))
    )
  : null;

// Lazy loaded pages
const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/pages/Auth'));
const ApiDocsPage = lazy(() => import('@/pages/ApiDocsPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const DashboardV2 = lazy(() => import('@/pages/DashboardV2'));
const CamerasPage = lazy(() => import('@/pages/CamerasPage'));
const NvrsPage = lazy(() => import('@/pages/NvrsPage'));
const NvrDetailPage = lazy(() => import('@/pages/NvrDetailPage'));
const CameraStatusPage = lazy(() => import('@/pages/CameraStatusPage'));
const CameraFleetHealthPage = lazy(() => import('@/pages/CameraFleetHealthPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const ZonesPage = lazy(() => import('@/pages/ZonesPage'));
const RecordingsPage = lazy(() => import('@/pages/RecordingsPage'));
const SyncPlaybackPage = lazy(() => import('@/pages/SyncPlaybackPage'));
const NvrDownloadsPage = lazy(() => import('@/pages/NvrDownloadsPage'));
const NvrDownloadHistoryPage = lazy(() => import('@/pages/NvrDownloadHistoryPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const SecurityPage = lazy(() => import('@/pages/SecurityPage'));
const ApiUsageDashboardPage = lazy(() => import('@/pages/ApiUsageDashboardPage'));
const CspReportsDashboardPage = lazy(() => import('@/pages/CspReportsDashboardPage'));
const FaceRecognitionPage = lazy(() => import('@/pages/FaceRecognitionPage'));
// Onda 197: busca retroativa no histórico facial (paridade SIM Next).
const FaceSearchPage = lazy(() => import('@/pages/FaceSearchPage'));
const LicensePlatePage = lazy(() => import('@/pages/LicensePlatePage'));
const HeatmapPage = lazy(() => import('@/pages/HeatmapPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const PPEPage = lazy(() => import('@/pages/PPEPage'));
const PeoplePage = lazy(() => import('@/pages/PeoplePage'));
const RecognitionLogsPage = lazy(() => import('@/pages/RecognitionLogsPage'));
const RecognitionAnalyticsPage = lazy(() => import('@/pages/RecognitionAnalyticsPage'));
const StreamSettingsPage = lazy(() => import('@/pages/StreamSettingsPage'));
const TelegramSettingsPage = lazy(() => import('@/pages/TelegramSettingsPage'));
const NotificationSettingsPage = lazy(() => import('@/pages/NotificationSettingsPage'));
const StreamAlertThresholdsPage = lazy(() => import('@/pages/StreamAlertThresholdsPage'));
const AutomationRulesPage = lazy(() => import('@/pages/AutomationRulesPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));
const PanicEventsPage = lazy(() => import('@/pages/PanicEventsPage'));
const ProductivityDashboardPage = lazy(() => import('@/pages/ProductivityDashboardPage'));
const BehaviorDetectionPage = lazy(() => import('@/pages/BehaviorDetectionPage'));
const JourneyReportsPage = lazy(() => import('@/pages/JourneyReportsPage'));
const CollaboratorFlowMapPage = lazy(() => import('@/pages/CollaboratorFlowMapPage'));
const GoalsAlertsPage = lazy(() => import('@/pages/GoalsAlertsPage'));
const UserManagementPage = lazy(() => import('@/pages/UserManagementPage'));
const CoveragePage = lazy(() => import('@/pages/CoveragePage'));
const OperationsPage = lazy(() => import('@/pages/OperationsPage'));
const TestModePage = lazy(() => import('@/pages/TestModePage'));
const LocalAgentsPage = lazy(() => import('@/pages/LocalAgentsPage'));
const CollabNetworkPage = lazy(() => import('@/pages/CollabNetworkPage'));
const MaintenanceConsolePage = lazy(() => import('@/pages/MaintenanceConsolePage'));
const AlarmSchemesPage = lazy(() => import('@/pages/AlarmSchemesPage'));
const FavoriteViewsPage = lazy(() => import('@/pages/FavoriteViewsPage'));
const DetachedMonitorPage = lazy(() => import('@/pages/DetachedMonitorPage'));
const DeviceRegistrationsPage = lazy(() => import('@/pages/DeviceRegistrationsPage'));
const EvidenceExportsPage = lazy(() => import('@/pages/EvidenceExportsPage'));
const AttestationConferencePage = lazy(() => import('@/pages/AttestationConferencePage'));
const SitePlanPage = lazy(() => import('@/pages/SitePlanPage'));

const CLSReportPage = lazy(() => import('@/pages/CLSReportPage'));
const LoadingStatesChecklistPage = lazy(() => import('@/pages/LoadingStatesChecklistPage'));
const AlertsTimelinePage = lazy(() => import('@/pages/AlertsTimelinePage'));
const EvaluationPage = lazy(() => import('@/pages/EvaluationPage'));
const EventAlertsDashboardPage = lazy(() => import('@/pages/EventAlertsDashboardPage'));
const OutOfAreaEventsPage = lazy(() => import('@/pages/OutOfAreaEventsPage'));
const NightSuspiciousEventsPage = lazy(() => import('@/pages/NightSuspiciousEventsPage'));
const IncidentNotificationsPage = lazy(() => import('@/pages/IncidentNotificationsPage'));
const WeeklyReportPage = lazy(() => import('@/pages/WeeklyReportPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const AcessoNegado = lazy(() => import('@/pages/AcessoNegado'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SchedulesPage = lazy(() => import('@/pages/SchedulesPage'));
const TimelapsePage = lazy(() => import('@/pages/TimelapsePage'));
const MotionMasksPage = lazy(() => import('@/pages/MotionMasksPage'));
const StreamHealthPage = lazy(() => import('@/pages/StreamHealthPage'));
const BandwidthMonitorPage = lazy(() => import('@/pages/BandwidthMonitorPage'));
const LivePreviewHarnessPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/LivePreviewHarnessPage'))
  : null;
const PtzCalibrationHarnessPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/PtzCalibrationHarnessPage'))
  : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = React.forwardRef<HTMLDivElement>(function PageLoader(_props, _ref) {
  return <SplashScreen />;
});
PageLoader.displayName = 'PageLoader';

// Layout wrapper para rotas protegidas com MainLayout
const ProtectedLayoutRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MainLayout>
      {children}
      <PanicButton />
    </MainLayout>
  );
};

// VISÃO App Component
const App = forwardRef<HTMLDivElement>(function App(_props, _ref) {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <SkeletonToggleProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <SkeletonToggleButton />
                <SkeletonFailureToggleButton />
                <MobileMenuChecklist />
                <BrowserRouter>
                  <AuthProvider>
                    <HistoryProvider>
                      <TraceIdManager />
                      <NotificationProvider>
                        <DynamicTitleManager />
                        <NavigationProgress />
                        <IdleRoutePrefetcher />
                        <CronStaleWatcher />
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/" element={withRouteErrorBoundary(<Index />, 'Início')} />
                            <Route
                              path="/auth"
                              element={withRouteErrorBoundary(<Auth />, 'Autenticação')}
                            />
                            <Route path="/login" element={<Navigate to="/auth" replace />} />
                            <Route path="/register" element={<Navigate to="/auth" replace />} />
                            <Route path="/persons" element={<Navigate to="/people" replace />} />
                            <Route
                              path="/vehicles"
                              element={<Navigate to="/license-plate" replace />}
                            />
                            <Route
                              path="/auth/callback"
                              element={withRouteErrorBoundary(<AuthCallback />, 'Auth Callback')}
                            />
                            <Route
                              path="/reset-password"
                              element={withRouteErrorBoundary(
                                <ResetPasswordPage />,
                                'Redefinir Senha'
                              )}
                            />
                            <Route
                              path="/docs/api"
                              element={withRouteErrorBoundary(<ApiDocsPage />, 'API Docs')}
                            />
                            <Route
                              path="/precos"
                              element={withRouteErrorBoundary(<PricingPage />, 'Preços')}
                            />
                            <Route path="/pricing" element={<Navigate to="/precos" replace />} />
                            <Route
                              path="/dashboard"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<DashboardV2 />, 'Dashboard')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/cameras"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<CamerasPage />, 'Câmeras')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/cameras/novo"
                              element={<Navigate to="/cameras?novo=1" replace />}
                            />
                            <Route
                              path="/cameras/:id/status"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<CameraStatusPage />, 'Status da Câmera')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/cameras/frota"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <CameraFleetHealthPage />,
                                    'Painel da Frota'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/frota"
                              element={<Navigate to="/cameras/frota" replace />}
                            />
                            <Route
                              path="/visualizacoes"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <FavoriteViewsPage />,
                                    'Visualizações Favoritas'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/favoritos"
                              element={<Navigate to="/visualizacoes" replace />}
                            />
                            <Route
                              path="/dispositivos"
                              element={
                                <ProtectedRoute>
                                  {withRouteErrorBoundary(
                                    <DeviceRegistrationsPage />,
                                    'Conexão por Registro'
                                  )}
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/monitor/:cameraId"
                              element={
                                <ProtectedRoute>
                                  {withRouteErrorBoundary(
                                    <DetachedMonitorPage />,
                                    'Monitor Destacado'
                                  )}
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/alerts"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<AlertsPage />, 'Alertas')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/alerts-timeline"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <AlertsTimelinePage />,
                                    'Timeline de Alertas'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/event-alerts"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <EventAlertsDashboardPage />,
                                    'Dashboard de Alertas'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/eventos/fora-de-area"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <OutOfAreaEventsPage />,
                                    'Fora da Área Permitida'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/eventos/noturnos"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <NightSuspiciousEventsPage />,
                                    'Alertas Noturnos'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/notificacoes"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <IncidentNotificationsPage />,
                                    'Notificações de Incidentes'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/relatorio-semanal"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <WeeklyReportPage />,
                                    'Relatório Semanal'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/evaluation"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <EvaluationPage />,
                                    'Avaliação de Detecções'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/zones"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<ZonesPage />, 'Zonas')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/recordings"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<RecordingsPage />, 'Gravações')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/playback"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <SyncPlaybackPage />,
                                    'Playback Sincronizado'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/playback/downloads"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <NvrDownloadsPage />,
                                    'Downloads de Gravações'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/playback/downloads/history"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <NvrDownloadHistoryPage />,
                                    'Histórico de Downloads'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/nvr-downloads"
                              element={<Navigate to="/playback/downloads" replace />}
                            />
                            <Route
                              path="/analytics"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<AnalyticsPage />, 'Analytics')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/settings"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(<SettingsPage />, 'Configurações')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/security"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(<SecurityPage />, 'Segurança')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/face-recognition"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <FaceRecognitionPage />,
                                    'Reconhecimento Facial'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/busca-de-faces"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="operator">
                                    {withRouteErrorBoundary(<FaceSearchPage />, 'Busca de Faces')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/face-search"
                              element={<Navigate to="/busca-de-faces" replace />}
                            />
                            <Route
                              path="/license-plate"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<LicensePlatePage />, 'Placas')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/heatmap"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<HeatmapPage />, 'Mapa de Calor')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/reports"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<ReportsPage />, 'Relatórios')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/ppe"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<PPEPage />, 'EPI')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/people"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="operator">
                                    {withRouteErrorBoundary(<PeoplePage />, 'Pessoas')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/recognition-logs"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <RecognitionLogsPage />,
                                    'Logs de Reconhecimento'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/recognition-analytics"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <RecognitionAnalyticsPage />,
                                    'Analytics de Reconhecimento'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/stream-settings"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <StreamSettingsPage />,
                                      'Config. de Stream'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/telegram-settings"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <TelegramSettingsPage />,
                                      'Config. Telegram'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/notification-settings"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <NotificationSettingsPage />,
                                      'Config. Notificações'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/stream-alert-thresholds"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <StreamAlertThresholdsPage />,
                                      'Parâmetros de Alerta'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/automation-rules"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <AutomationRulesPage />,
                                      'Regras de Automação'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/profile"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<ProfilePage />, 'Perfil')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/help"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<HelpPage />, 'Ajuda')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/panic-events"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<PanicEventsPage />, 'Eventos de Pânico')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/schedules"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<SchedulesPage />, 'Agendamentos')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/timelapse"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<TimelapsePage />, 'Timelapse')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/motion-masks"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <MotionMasksPage />,
                                    'Máscaras de Movimento'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/stream-health"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <StreamHealthPage />,
                                    'Saúde dos Streams'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/bandwidth-monitor"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <BandwidthMonitorPage />,
                                    'Consumo de Banda'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/productivity"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <ProductivityDashboardPage />,
                                    'Produtividade'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/behavior-detection"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <BehaviorDetectionPage />,
                                    'Detecção de Comportamento'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/journey-reports"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <JourneyReportsPage />,
                                    'Relatórios de Jornada'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/collaborator-flow"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <CollaboratorFlowMapPage />,
                                    'Fluxo de Colaboradores'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/goals-alerts"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<GoalsAlertsPage />, 'Metas e Alertas')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/users"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="admin">
                                    {withRouteErrorBoundary(
                                      <UserManagementPage />,
                                      'Gestão de Usuários'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/coverage"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="admin">
                                    {withRouteErrorBoundary(
                                      <CoveragePage />,
                                      'Cobertura de Testes'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/operations"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="admin">
                                    {withRouteErrorBoundary(<OperationsPage />, 'Operações')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/test-mode"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(<TestModePage />, 'Modo Teste')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/agentes-locais"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(<LocalAgentsPage />, 'Agentes Locais')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/rede-colaborativa"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <CollabNetworkPage />,
                                      'Rede Colaborativa'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/manutencao"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="admin">
                                    {withRouteErrorBoundary(
                                      <MaintenanceConsolePage />,
                                      'Console de Manutenção'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/maintenance"
                              element={<Navigate to="/manutencao" replace />}
                            />
                            <Route
                              path="/esquemas-de-alarme"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <AlarmSchemesPage />,
                                      'Esquemas de Alarme'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/alarm-schemes"
                              element={<Navigate to="/esquemas-de-alarme" replace />}
                            />
                            <Route
                              path="/planta-baixa"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="operator">
                                    {withRouteErrorBoundary(<SitePlanPage />, 'Planta Baixa')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/conferencia-atestado"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <AttestationConferencePage />,
                                      'Conferência de Atestado'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/registro-probatorio"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(
                                      <EvidenceExportsPage />,
                                      'Registro Probatório'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/nvrs"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(<NvrsPage />, 'NVRs')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/nvrs/:id"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="manager">
                                    {withRouteErrorBoundary(<NvrDetailPage />, 'Detalhe NVR')}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />

                            <Route
                              path="/admin/api-usage"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="admin">
                                    {withRouteErrorBoundary(
                                      <ApiUsageDashboardPage />,
                                      'Uso da API'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/admin/csp-reports"
                              element={
                                <ProtectedLayoutRoute>
                                  <ProtectedRoute minRole="admin">
                                    {withRouteErrorBoundary(
                                      <CspReportsDashboardPage />,
                                      'Relatórios CSP'
                                    )}
                                  </ProtectedRoute>
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/cls-report"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(<CLSReportPage />, 'Relatório CLS')}
                                </ProtectedLayoutRoute>
                              }
                            />
                            <Route
                              path="/dev/loading-states"
                              element={
                                <ProtectedLayoutRoute>
                                  {withRouteErrorBoundary(
                                    <LoadingStatesChecklistPage />,
                                    'Loading States Checklist'
                                  )}
                                </ProtectedLayoutRoute>
                              }
                            />
                            {LivePreviewHarnessPage && (
                              <Route
                                path="/__test/live-preview"
                                element={withRouteErrorBoundary(
                                  <LivePreviewHarnessPage />,
                                  'Live Preview Harness'
                                )}
                              />
                            )}
                            {PtzCalibrationHarnessPage && (
                              <Route
                                path="/__test/ptz-calibration"
                                element={withRouteErrorBoundary(
                                  <PtzCalibrationHarnessPage />,
                                  'PTZ Calibration Harness'
                                )}
                              />
                            )}
                            <Route
                              path="/acesso-negado"
                              element={withRouteErrorBoundary(<AcessoNegado />, 'Acesso Negado')}
                            />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                      </NotificationProvider>
                    </HistoryProvider>
                  </AuthProvider>
                </BrowserRouter>
                {CLSBadge && (
                  <Suspense fallback={null}>
                    <CLSBadge />
                  </Suspense>
                )}
                {CLSShiftOverlay && (
                  <Suspense fallback={null}>
                    <CLSShiftOverlay />
                  </Suspense>
                )}
              </TooltipProvider>
            </SkeletonToggleProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
});

export default App;
