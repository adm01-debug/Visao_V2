import { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  Map,
  Eye,
} from 'lucide-react';
import { CameraModal } from './CameraModal';
import { ExportMenu } from './ExportMenu';
import { LazyCameraMap as CameraMap } from './LazyCameraMap';
import { CameraLayoutControls, CameraLayout } from './CameraLayoutControls';
import { SearchInput, filterCamerasBySearch } from './SearchInput';
import { UIAlert } from './AlertCard';
import { useCameras } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PullToRefresh, useSwipe } from '@/components/ui/MobileInteractions';
import { exportCameras } from '@/lib/exportUtils';

import {
  StreamCameraCard,
  DashboardStats,
  DashboardAlerts,
  StatsSkeleton,
  CameraGridSkeleton,
  AlertsSidebarSkeleton,
  mapDbCameraToUI,
} from './dashboard';

function DashboardComponent() {
  const navigate = useNavigate();
  const { cameras, loading: camerasLoading, updateCamera, refetch: refetchCameras } = useCameras();
  const { alerts, loading: alertsLoading, unreadCount, markAllAsRead, refetch: refetchAlerts } = useAlerts();
  const [selectedCamera, setSelectedCamera] = useState<ReturnType<typeof mapDbCameraToUI> | null>(null);
  const [cameraLayout, setCameraLayout] = useState<CameraLayout>(() =>
    (localStorage.getItem('camera-layout') as CameraLayout) || '2x2'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [enableStreams, setEnableStreams] = useState(true);

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
  const uiAlerts: UIAlert[] = alertsLoading ? [] : alerts.map(a => ({
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
  const priorityCameras = searchedCameras.filter(c => c.status === 'alert' || c.status === 'warning');
  const normalCameras = searchedCameras.filter(c => c.status === 'online' || c.status === 'offline');

  const totalPeople = uiCameras.reduce((sum, c) => sum + (c.detectedPeople || 0), 0);
  const onlineCameras = uiCameras.filter(c => c.status !== 'offline').length;
  const activeAlerts = uiAlerts.filter(a => !a.isRead).length;
  const streamingCameras = uiCameras.filter(c => c.streamUrl).length;

  const getCameraGridClass = () => {
    switch (cameraLayout) {
      case '2x2': return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      case '3x3': return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';
      case 'list': return 'flex flex-col gap-2';
      default: return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    }
  };

  return (
    <TooltipProvider>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="p-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="space-y-6">
            {/* Stats Cards */}
            {camerasLoading ? <StatsSkeleton /> : (
              <DashboardStats
                onlineCameras={onlineCameras}
                totalCameras={cameras.length}
                totalPeople={totalPeople}
                activeAlerts={activeAlerts}
                streamingCameras={streamingCameras}
              />
            )}

            {/* Controls Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Buscar câmeras ou alertas..." />
                <div className="flex items-center gap-2">
                  <Switch id="enable-streams" checked={enableStreams} onCheckedChange={setEnableStreams} />
                  <Label htmlFor="enable-streams" className="text-sm cursor-pointer">Streams ao vivo</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CameraLayoutControls layout={cameraLayout} onLayoutChange={setCameraLayout} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showMap ? 'default' : 'outline'}
                      size="icon" className="h-8 w-8"
                      onClick={() => setShowMap(!showMap)}
                    >
                      <Map className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mostrar Mapa</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cameras Section */}
              <div className="lg:col-span-2 space-y-6 animate-fade-in-delay-1">
                {camerasLoading ? (
                  <CameraGridSkeleton count={4} />
                ) : (
                  <>
                    {/* Map */}
                    {showMap && uiCameras.some(c => c.latitude && c.longitude) && (
                      <div className="h-64 rounded-lg overflow-hidden border">
                        <CameraMap
                          cameras={uiCameras.filter(c => c.latitude && c.longitude)}
                          onCameraClick={(id) => {
                            const cam = uiCameras.find(c => c.id === id);
                            if (cam) setSelectedCamera(cam);
                          }}
                        />
                      </div>
                    )}

                    {/* Camera Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Monitoramento</h2>
                        <Badge variant="secondary" className="ml-2">
                          {onlineCameras}/{cameras.length} online
                        </Badge>
                      </div>
                      <ExportMenu
                        onExportCSV={() => exportCameras(cameras, 'csv')}
                        onExportPDF={() => exportCameras(cameras, 'pdf')}
                        disabled={cameras.length === 0}
                      />
                    </div>

                    {/* Priority Cameras */}
                    {priorityCameras.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          <h2 className="text-lg font-semibold text-foreground">Câmeras com Alertas</h2>
                        </div>
                        <div className={getCameraGridClass()}>
                          {priorityCameras.map(camera => (
                            <StreamCameraCard
                              key={camera.id}
                              camera={camera}
                              onClick={() => setSelectedCamera(camera)}
                              compact={cameraLayout === 'list'}
                              showStream={enableStreams}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Cameras */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-primary" />
                          <h2 className="text-lg font-semibold text-foreground">Todas as Câmeras</h2>
                        </div>
                        <button className="text-sm text-primary hover:underline">Ver todas</button>
                      </div>
                      <div className={getCameraGridClass()}>
                        {normalCameras.slice(0, cameraLayout === '3x3' ? 9 : 6).map(camera => (
                          <StreamCameraCard
                            key={camera.id}
                            camera={camera}
                            onClick={() => setSelectedCamera(camera)}
                            compact={cameraLayout === 'list'}
                            showStream={enableStreams}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Alerts Sidebar */}
              {alertsLoading ? (
                <AlertsSidebarSkeleton />
              ) : (
                <DashboardAlerts
                  uiAlerts={uiAlerts}
                  uiCameras={uiCameras}
                  searchQuery={searchQuery}
                  alerts={alerts}
                  unreadCount={unreadCount}
                  markAllAsRead={markAllAsRead}
                />
              )}
            </div>
          </div>

          {/* Camera Modal */}
          {selectedCamera && (
            <CameraModal
              camera={selectedCamera}
              isOpen={!!selectedCamera}
              onClose={() => setSelectedCamera(null)}
              onUpdateCoordinates={async (id, latitude, longitude) => {
                await updateCamera(id, { latitude, longitude });
                setSelectedCamera(prev => prev ? { ...prev, latitude, longitude } : null);
              }}
            />
          )}

          {/* Swipe hint for mobile */}
          <p className="text-center text-xs text-muted-foreground md:hidden pb-4">
            ← Deslize para navegar →
          </p>
        </div>
      </PullToRefresh>
    </TooltipProvider>
  );
}

export const Dashboard = memo(DashboardComponent);
