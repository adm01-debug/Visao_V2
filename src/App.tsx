import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MainLayout } from "@/components/MainLayout";

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
const NotFound = lazy(() => import("@/pages/NotFound"));
const AcessoNegado = lazy(() => import("@/pages/AcessoNegado"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// Layout wrapper para rotas protegidas com MainLayout
const ProtectedLayoutRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <MainLayout>{children}</MainLayout>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <NotificationProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<ProtectedLayoutRoute><DashboardV2 /></ProtectedLayoutRoute>} />
                    <Route path="/cameras" element={<ProtectedLayoutRoute><CamerasPage /></ProtectedLayoutRoute>} />
                    <Route path="/alerts" element={<ProtectedLayoutRoute><AlertsPage /></ProtectedLayoutRoute>} />
                    <Route path="/zones" element={<ProtectedLayoutRoute><ZonesPage /></ProtectedLayoutRoute>} />
                    <Route path="/recordings" element={<ProtectedLayoutRoute><RecordingsPage /></ProtectedLayoutRoute>} />
                    <Route path="/analytics" element={<ProtectedLayoutRoute><AnalyticsPage /></ProtectedLayoutRoute>} />
                    <Route path="/settings" element={<ProtectedLayoutRoute><SettingsPage /></ProtectedLayoutRoute>} />
                    <Route path="/security" element={<ProtectedLayoutRoute><SecurityPage /></ProtectedLayoutRoute>} />
                    <Route path="/face-recognition" element={<ProtectedLayoutRoute><FaceRecognitionPage /></ProtectedLayoutRoute>} />
                    <Route path="/license-plate" element={<ProtectedLayoutRoute><LicensePlatePage /></ProtectedLayoutRoute>} />
                    <Route path="/heatmap" element={<ProtectedLayoutRoute><HeatmapPage /></ProtectedLayoutRoute>} />
                    <Route path="/reports" element={<ProtectedLayoutRoute><ReportsPage /></ProtectedLayoutRoute>} />
                    <Route path="/ppe" element={<ProtectedLayoutRoute><PPEPage /></ProtectedLayoutRoute>} />
                    <Route path="/people" element={<ProtectedLayoutRoute><PeoplePage /></ProtectedLayoutRoute>} />
                    <Route path="/recognition-logs" element={<ProtectedLayoutRoute><RecognitionLogsPage /></ProtectedLayoutRoute>} />
                    <Route path="/recognition-analytics" element={<ProtectedLayoutRoute><RecognitionAnalyticsPage /></ProtectedLayoutRoute>} />
                    <Route path="/stream-settings" element={<ProtectedLayoutRoute><StreamSettingsPage /></ProtectedLayoutRoute>} />
                    <Route path="/telegram-settings" element={<ProtectedLayoutRoute><TelegramSettingsPage /></ProtectedLayoutRoute>} />
                    <Route path="/notification-settings" element={<ProtectedLayoutRoute><NotificationSettingsPage /></ProtectedLayoutRoute>} />
                    <Route path="/automation-rules" element={<ProtectedLayoutRoute><AutomationRulesPage /></ProtectedLayoutRoute>} />
                    <Route path="/acesso-negado" element={<AcessoNegado />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </NotificationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
