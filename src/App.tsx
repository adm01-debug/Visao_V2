import React, { Suspense, lazy, forwardRef } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner, SplashScreen } from "@/components/LoadingSpinner";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PanicButton } from "@/components/PanicButton";

import { withRouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { errorReporter } from "@/lib/errorReporter";

// Install global error monitoring
errorReporter.installGlobalHandlers();

// Lazy loaded pages
const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const DashboardV2 = lazy(() => import("@/pages/DashboardV2"));
const CamerasPage = lazy(() => import("@/pages/CamerasPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const ZonesPage = lazy(() => import("@/pages/ZonesPage"));
const RecordingsPage = lazy(() => import("@/pages/RecordingsPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const SecurityPage = lazy(() => import("@/pages/SecurityPage"));
const FaceRecognitionPage = lazy(() => import("@/pages/FaceRecognitionPage"));
const LicensePlatePage = lazy(() => import("@/pages/LicensePlatePage"));
const HeatmapPage = lazy(() => import("@/pages/HeatmapPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const PPEPage = lazy(() => import("@/pages/PPEPage"));
const PeoplePage = lazy(() => import("@/pages/PeoplePage"));
const RecognitionLogsPage = lazy(() => import("@/pages/RecognitionLogsPage"));
const RecognitionAnalyticsPage = lazy(() => import("@/pages/RecognitionAnalyticsPage"));
const StreamSettingsPage = lazy(() => import("@/pages/StreamSettingsPage"));
const TelegramSettingsPage = lazy(() => import("@/pages/TelegramSettingsPage"));
const NotificationSettingsPage = lazy(() => import("@/pages/NotificationSettingsPage"));
const AutomationRulesPage = lazy(() => import("@/pages/AutomationRulesPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const PanicEventsPage = lazy(() => import("@/pages/PanicEventsPage"));
const ProductivityDashboardPage = lazy(() => import("@/pages/ProductivityDashboardPage"));
const BehaviorDetectionPage = lazy(() => import("@/pages/BehaviorDetectionPage"));
const JourneyReportsPage = lazy(() => import("@/pages/JourneyReportsPage"));
const CollaboratorFlowMapPage = lazy(() => import("@/pages/CollaboratorFlowMapPage"));
const GoalsAlertsPage = lazy(() => import("@/pages/GoalsAlertsPage"));
const UserManagementPage = lazy(() => import("@/pages/UserManagementPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AcessoNegado = lazy(() => import("@/pages/AcessoNegado"));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

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

const PageLoader = () => <SplashScreen />;

// Layout wrapper para rotas protegidas com MainLayout
const ProtectedLayoutRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <MainLayout>{children}<PanicButton /></MainLayout>;
};

// VISÃO App Component
const App = forwardRef<HTMLDivElement>(function App(_props, _ref) { return (
  <ErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <NotificationProvider>
                <NavigationProgress />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={withRouteErrorBoundary(<Index />, "Início")} />
                    <Route path="/auth" element={withRouteErrorBoundary(<Auth />, "Autenticação")} />
                    <Route path="/login" element={<Navigate to="/auth" replace />} />
                    <Route path="/register" element={<Navigate to="/auth" replace />} />
                    <Route path="/persons" element={<Navigate to="/people" replace />} />
                    <Route path="/vehicles" element={<Navigate to="/license-plate" replace />} />
                    <Route path="/auth/callback" element={withRouteErrorBoundary(<AuthCallback />, "Auth Callback")} />
                    <Route path="/reset-password" element={withRouteErrorBoundary(<ResetPasswordPage />, "Redefinir Senha")} />
                    <Route path="/dashboard" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<DashboardV2 />, "Dashboard")}</ProtectedLayoutRoute>} />
                    <Route path="/cameras" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<CamerasPage />, "Câmeras")}</ProtectedLayoutRoute>} />
                    <Route path="/alerts" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<AlertsPage />, "Alertas")}</ProtectedLayoutRoute>} />
                    <Route path="/zones" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<ZonesPage />, "Zonas")}</ProtectedLayoutRoute>} />
                    <Route path="/recordings" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<RecordingsPage />, "Gravações")}</ProtectedLayoutRoute>} />
                    <Route path="/analytics" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<AnalyticsPage />, "Analytics")}</ProtectedLayoutRoute>} />
                    <Route path="/settings" element={<ProtectedLayoutRoute><ProtectedRoute minRole="manager">{withRouteErrorBoundary(<SettingsPage />, "Configurações")}</ProtectedRoute></ProtectedLayoutRoute>} />
                    <Route path="/security" element={<ProtectedLayoutRoute><ProtectedRoute minRole="manager">{withRouteErrorBoundary(<SecurityPage />, "Segurança")}</ProtectedRoute></ProtectedLayoutRoute>} />
                    <Route path="/face-recognition" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<FaceRecognitionPage />, "Reconhecimento Facial")}</ProtectedLayoutRoute>} />
                    <Route path="/license-plate" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<LicensePlatePage />, "Placas")}</ProtectedLayoutRoute>} />
                    <Route path="/heatmap" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<HeatmapPage />, "Mapa de Calor")}</ProtectedLayoutRoute>} />
                    <Route path="/reports" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<ReportsPage />, "Relatórios")}</ProtectedLayoutRoute>} />
                    <Route path="/ppe" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<PPEPage />, "EPI")}</ProtectedLayoutRoute>} />
                    <Route path="/people" element={<ProtectedLayoutRoute><ProtectedRoute minRole="operator">{withRouteErrorBoundary(<PeoplePage />, "Pessoas")}</ProtectedRoute></ProtectedLayoutRoute>} />
                    <Route path="/recognition-logs" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<RecognitionLogsPage />, "Logs de Reconhecimento")}</ProtectedLayoutRoute>} />
                    <Route path="/recognition-analytics" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<RecognitionAnalyticsPage />, "Analytics de Reconhecimento")}</ProtectedLayoutRoute>} />
                    <Route path="/stream-settings" element={<ProtectedLayoutRoute><ProtectedRoute minRole="manager">{withRouteErrorBoundary(<StreamSettingsPage />, "Config. de Stream")}</ProtectedRoute></ProtectedLayoutRoute>} />
                    <Route path="/telegram-settings" element={<ProtectedLayoutRoute><ProtectedRoute minRole="manager">{withRouteErrorBoundary(<TelegramSettingsPage />, "Config. Telegram")}</ProtectedRoute></ProtectedLayoutRoute>} />
                    <Route path="/notification-settings" element={<ProtectedLayoutRoute><ProtectedRoute minRole="manager">{withRouteErrorBoundary(<NotificationSettingsPage />, "Config. Notificações")}</ProtectedRoute></ProtectedLayoutRoute>} />
                    <Route path="/automation-rules" element={<ProtectedLayoutRoute><ProtectedRoute minRole="manager">{withRouteErrorBoundary(<AutomationRulesPage />, "Regras de Automação")}</ProtectedRoute></ProtectedLayoutRoute>} />
                    <Route path="/profile" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<ProfilePage />, "Perfil")}</ProtectedLayoutRoute>} />
                    <Route path="/help" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<HelpPage />, "Ajuda")}</ProtectedLayoutRoute>} />
                    <Route path="/panic-events" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<PanicEventsPage />, "Eventos de Pânico")}</ProtectedLayoutRoute>} />
                    <Route path="/productivity" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<ProductivityDashboardPage />, "Produtividade")}</ProtectedLayoutRoute>} />
                    <Route path="/behavior-detection" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<BehaviorDetectionPage />, "Detecção de Comportamento")}</ProtectedLayoutRoute>} />
                    <Route path="/journey-reports" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<JourneyReportsPage />, "Relatórios de Jornada")}</ProtectedLayoutRoute>} />
                    <Route path="/collaborator-flow" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<CollaboratorFlowMapPage />, "Fluxo de Colaboradores")}</ProtectedLayoutRoute>} />
                    <Route path="/goals-alerts" element={<ProtectedLayoutRoute>{withRouteErrorBoundary(<GoalsAlertsPage />, "Metas e Alertas")}</ProtectedLayoutRoute>} />
                    <Route path="/users" element={<ProtectedLayoutRoute><ProtectedRoute minRole="admin">{withRouteErrorBoundary(<UserManagementPage />, "Gestão de Usuários")}</ProtectedRoute></ProtectedLayoutRoute>} />
                    <Route path="/acesso-negado" element={withRouteErrorBoundary(<AcessoNegado />, "Acesso Negado")} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </NotificationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
); });

export default App;

