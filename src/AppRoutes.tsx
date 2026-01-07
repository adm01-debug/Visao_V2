/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Arquivo: AppRoutes.tsx
 * 
 * Configuração de rotas e navegação do sistema
 */

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';

import { ProtectedRoute } from '@/components/ProtectedRoute';

// Lazy loading das páginas
const Dashboard = lazy(() => import('@/pages/Index'));
const DashboardV2 = lazy(() => import('@/pages/DashboardV2'));
const CustomizableDashboard = lazy(() => import('@/components/CustomizableDashboard'));
const CamerasPage = lazy(() => import('@/pages/CamerasPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const PeoplePage = lazy(() => import('@/pages/PeoplePage'));
const FaceRecognitionPage = lazy(() => import('@/pages/FaceRecognitionPage'));
const RecognitionLogsPage = lazy(() => import('@/pages/RecognitionLogsPage'));
const RecognitionAnalyticsPage = lazy(() => import('@/pages/RecognitionAnalyticsPage'));
const ZonesPage = lazy(() => import('@/pages/ZonesPage'));
const RecordingsPage = lazy(() => import('@/pages/RecordingsPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SecurityPage = lazy(() => import('@/pages/SecurityPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AuthPage = lazy(() => import('@/pages/Auth'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));
const NotificationSettingsPage = lazy(() => import('@/pages/NotificationSettingsPage'));
const StreamSettingsPage = lazy(() => import('@/pages/StreamSettingsPage'));
const HeatmapPage = lazy(() => import('@/pages/HeatmapPage'));
const LicensePlatePage = lazy(() => import('@/pages/LicensePlatePage'));
const TelegramSettingsPage = lazy(() => import('@/pages/TelegramSettingsPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const PPEPage = lazy(() => import('@/pages/PPEPage'));
const AcessoNegado = lazy(() => import('@/pages/AcessoNegado'));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

// Rotas do app
export function AppRoutes() {
  const { shortcuts, showHelp, toggleHelp, enabled, setEnabled } = useKeyboardShortcuts();

  return (
    <>
      <KeyboardShortcutsHelp
        open={showHelp}
        onOpenChange={toggleHelp}
        shortcuts={shortcuts}
        enabled={enabled}
        onEnabledChange={setEnabled}
      />
      
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardV2 /></ProtectedRoute>} />
          <Route path="/dashboard/custom" element={<ProtectedRoute><CustomizableDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/classic" element={<Dashboard />} />
          
          {/* Câmeras */}
          <Route path="/cameras" element={<ProtectedRoute><CamerasPage /></ProtectedRoute>} />
          <Route path="/cameras/:id" element={<CamerasPage />} />
          
          {/* Alertas */}
          <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
          
          {/* Pessoas/Colaboradores */}
          <Route path="/people" element={<ProtectedRoute><PeoplePage /></ProtectedRoute>} />
          
          {/* Reconhecimento Facial */}
          <Route path="/face-recognition" element={<ProtectedRoute><FaceRecognitionPage /></ProtectedRoute>} />
          <Route path="/recognition-logs" element={<ProtectedRoute><RecognitionLogsPage /></ProtectedRoute>} />
          <Route path="/recognition-analytics" element={<ProtectedRoute><RecognitionAnalyticsPage /></ProtectedRoute>} />
          
          {/* Zonas */}
          <Route path="/zones" element={<ProtectedRoute><ZonesPage /></ProtectedRoute>} />
          
          {/* Gravações */}
          <Route path="/recordings" element={<ProtectedRoute><RecordingsPage /></ProtectedRoute>} />
          
          {/* Analytics */}
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          
          {/* Segurança */}
          <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
          
          {/* PPE - Equipamentos de Proteção */}
          <Route path="/ppe" element={<ProtectedRoute><PPEPage /></ProtectedRoute>} />
          
          {/* Analytics Avançado */}
          <Route path="/heatmap" element={<ProtectedRoute><HeatmapPage /></ProtectedRoute>} />
          <Route path="/license-plates" element={<ProtectedRoute><LicensePlatePage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          
          {/* Configurações */}
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
          <Route path="/settings/telegram" element={<TelegramSettingsPage />} />
          <Route path="/settings/streams" element={<StreamSettingsPage />} />
          
          {/* Auth */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          
          {/* 404 */}

          {/* Página de Acesso Negado */}
          <Route path="/acesso-negado" element={<AcessoNegado />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default AppRoutes;

