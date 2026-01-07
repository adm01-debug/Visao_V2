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
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardV2 /></ProtectedRoute>} />
                    <Route path="/cameras" element={<ProtectedRoute><CamerasPage /></ProtectedRoute>} />
                    <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
                    <Route path="/zones" element={<ProtectedRoute><ZonesPage /></ProtectedRoute>} />
                    <Route path="/recordings" element={<ProtectedRoute><RecordingsPage /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
                    <Route path="/face-recognition" element={<ProtectedRoute><FaceRecognitionPage /></ProtectedRoute>} />
                    <Route path="/license-plate" element={<ProtectedRoute><LicensePlatePage /></ProtectedRoute>} />
                    <Route path="/heatmap" element={<ProtectedRoute><HeatmapPage /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                    <Route path="/ppe" element={<ProtectedRoute><PPEPage /></ProtectedRoute>} />
                    <Route path="/people" element={<ProtectedRoute><PeoplePage /></ProtectedRoute>} />
                    <Route path="/recognition-logs" element={<ProtectedRoute><RecognitionLogsPage /></ProtectedRoute>} />
                    <Route path="/recognition-analytics" element={<ProtectedRoute><RecognitionAnalyticsPage /></ProtectedRoute>} />
                    <Route path="/stream-settings" element={<ProtectedRoute><StreamSettingsPage /></ProtectedRoute>} />
                    <Route path="/telegram-settings" element={<ProtectedRoute><TelegramSettingsPage /></ProtectedRoute>} />
                    <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} />
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

