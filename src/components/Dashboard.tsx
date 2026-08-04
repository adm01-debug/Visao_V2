import { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraModal } from './CameraModal';
import { CameraLayout } from './CameraLayoutControls';
import { filterCamerasBySearch } from './SearchInput';
import { UIAlert } from './AlertCard';
import { useCameras } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PullToRefresh, useSwipe } from '@/components/ui/MobileInteractions';

import {
  DashboardStats,
  DashboardAlerts,
  StatsSkeleton,
  CameraGridSkeleton,
  AlertsSidebarSkeleton,
  mapDbCameraToUI,
} from './dashboard';
import { DashboardControlsBar } from './dashboard/DashboardControlsBar';
import { DashboardCameraGrid } from './dashboard/DashboardCameraGrid';
import { AnimatedTransition } from './ui/AnimatedTransition';

function DashboardComponent() {
  const navigate = useNavigate();
  const { cameras, loading: camerasLoading, updateCamera, refetch: refetchCameras } = useCameras();
  const {
    alerts,
    loading: alertsLoading,
    unreadCount,
    markAllAsRead,
    refetch: refetchAlerts,
  } = useAlerts();
  const [selectedCamera, setSelectedCamera] = useState<ReturnType<typeof mapDbCameraToUI> | null>(
    null
  );
  const [cameraLayout, setCameraLayout] = useState<CameraLayout>(
    () => (localStorage.getItem('camera-layout') as CameraLayout) || '2x2'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [enableStreams, setEnableStreams] = useState(true);
  const [aiAnalysisCameras, setAiAnalysisCameras] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ai-analysis-cameras');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleToggleAiAnalysis = useCallback((cameraId: string, active: boolean) => {
    setAiAnalysisCameras((prev) => {
      const next = new Set(prev);
      if (active) next.add(cameraId);
      else next.delete(cameraId);
      localStorage.setItem('ai-analysis-cameras', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const { handleTouchStart, handleTouchEnd } = useSwipe(
    () => navigate('/cameras'),
    () => navigate('/settings')
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchCameras?.(), refetchAlerts?.()]);
  }, [refetchCameras, refetchAlerts]);

  useEffect(() => {
    localStorage.setItem('camera-layout', cameraLayout);
  }, [cameraLayout]);

  const uiCameras = camerasLoading ? [] : cameras.map(mapDbCameraToUI);
  const uiAlerts: UIAlert[] = alertsLoading
    ? []
    : alerts.map((a) => ({
        id: a.id,
        cameraId: a.camera_id || '',
        cameraName: a.camera_name,
        type: a.type,
        severity: a.severity,
        message: a.message,
        timestamp: new Date(a.timestamp),
        isRead: a.is_read,
        thumbnail: a.thumbnail || undefined,
      }));

  const searchedCameras = filterCamerasBySearch(uiCameras, searchQuery);
  const priorityCameras = searchedCameras.filter(
    (c) => c.status === 'alert' || c.status === 'warning'
  );
  const normalCameras = searchedCameras.filter(
    (c) => c.status === 'online' || c.status === 'offline'
  );

  const totalPeople = uiCameras.reduce((sum, c) => sum + (c.detectedPeople || 0), 0);
  const onlineCameras = uiCameras.filter((c) => c.status !== 'offline').length;
  const activeAlerts = uiAlerts.filter((a) => !a.isRead).length;
  const streamingCameras = uiCameras.filter((c) => c.streamUrl).length;

  return (
    <TooltipProvider>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="p-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="space-y-6">
            <AnimatedTransition loading={camerasLoading} skeleton={<StatsSkeleton />}>
              <DashboardStats
                onlineCameras={onlineCameras}
                totalCameras={cameras.length}
                totalPeople={totalPeople}
                activeAlerts={activeAlerts}
                streamingCameras={streamingCameras}
              />
            </AnimatedTransition>

            <DashboardControlsBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              enableStreams={enableStreams}
              onEnableStreamsChange={setEnableStreams}
              cameraLayout={cameraLayout}
              onLayoutChange={setCameraLayout}
              showMap={showMap}
              onShowMapChange={setShowMap}
              simulatorCameras={cameras.map((c) => ({ id: c.id, name: c.name }))}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AnimatedTransition
                loading={camerasLoading}
                skeleton={<CameraGridSkeleton count={4} />}
                className="lg:col-span-2 space-y-6"
              >
                <DashboardCameraGrid
                  uiCameras={uiCameras}
                  priorityCameras={priorityCameras}
                  normalCameras={normalCameras}
                  onlineCameras={onlineCameras}
                  totalCameras={cameras.length}
                  cameras={cameras}
                  cameraLayout={cameraLayout}
                  enableStreams={enableStreams}
                  showMap={showMap}
                  aiAnalysisCameras={aiAnalysisCameras}
                  onSelectCamera={setSelectedCamera}
                  onToggleAiAnalysis={handleToggleAiAnalysis}
                />
              </AnimatedTransition>

              <AnimatedTransition loading={alertsLoading} skeleton={<AlertsSidebarSkeleton />}>
                <DashboardAlerts
                  uiAlerts={uiAlerts}
                  uiCameras={uiCameras}
                  searchQuery={searchQuery}
                  alerts={alerts}
                  unreadCount={unreadCount}
                  markAllAsRead={markAllAsRead}
                />
              </AnimatedTransition>
            </div>
          </div>

          {selectedCamera && (
            <CameraModal
              camera={selectedCamera}
              isOpen={!!selectedCamera}
              onClose={() => setSelectedCamera(null)}
              onUpdateCoordinates={async (id, latitude, longitude) => {
                await updateCamera(id, { latitude, longitude });
                setSelectedCamera((prev) => (prev ? { ...prev, latitude, longitude } : null));
              }}
            />
          )}

          <p className="text-center text-xs text-muted-foreground md:hidden pb-4">
            ← Deslize para navegar →
          </p>
        </div>
      </PullToRefresh>
    </TooltipProvider>
  );
}

export const Dashboard = memo(DashboardComponent);
