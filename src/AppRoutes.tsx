/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Arquivo: AppRoutes.tsx
 * 
 * Configuração de rotas e navegação do sistema
 */

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Lazy loading das páginas
const Dashboard = lazy(() => import('@/pages/Index'));
const DashboardV2 = lazy(() => import('@/pages/DashboardV2'));
const CamerasPage = lazy(() => import('@/pages/CamerasPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const PeoplePage = lazy(() => import('@/pages/PeoplePage'));
const FaceRecognitionPage = lazy(() => import('@/pages/FaceRecognitionPage'));
const RecognitionLogsPage = lazy(() => import('@/pages/RecognitionLogsPage'));
const ZonesPage = lazy(() => import('@/pages/ZonesPage'));
const RecordingsPage = lazy(() => import('@/pages/RecordingsPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SecurityPage = lazy(() => import('@/pages/SecurityPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AuthPage = lazy(() => import('@/pages/Auth'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

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
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardV2 />} />
        <Route path="/dashboard/classic" element={<Dashboard />} />
        
        {/* Câmeras */}
        <Route path="/cameras" element={<CamerasPage />} />
        <Route path="/cameras/:id" element={<CamerasPage />} />
        
        {/* Alertas */}
        <Route path="/alerts" element={<AlertsPage />} />
        
        {/* Pessoas/Colaboradores */}
        <Route path="/people" element={<PeoplePage />} />
        
        {/* Reconhecimento Facial */}
        <Route path="/face-recognition" element={<FaceRecognitionPage />} />
        <Route path="/recognition-logs" element={<RecognitionLogsPage />} />
        
        {/* Zonas */}
        <Route path="/zones" element={<ZonesPage />} />
        
        {/* Gravações */}
        <Route path="/recordings" element={<RecordingsPage />} />
        
        {/* Analytics */}
        <Route path="/analytics" element={<AnalyticsPage />} />
        
        {/* Segurança */}
        <Route path="/security" element={<SecurityPage />} />
        
        {/* Configurações */}
        <Route path="/settings" element={<SettingsPage />} />
        
        {/* Auth */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
