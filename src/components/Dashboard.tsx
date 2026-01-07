import { memo, useCallback } from "react";
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: Dashboard (Refatorado)
 */
import { 
  Camera, 
  AlertTriangle, 
  Users, 
  Shield,
  TrendingUp,
  Activity,
  CheckCheck,
  ArrowUpDown,
  X,
  Map,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  Eye,
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { CameraCard } from './CameraCard';
import { AlertCard, UIAlert } from './AlertCard';
import { CameraModal } from './CameraModal';
import { ExportMenu } from './ExportMenu';
import { CameraMap } from './CameraMap';
import { AlertTrendsChart } from './AlertTrendsChart';
import { AlertsByCameraChart } from './AlertsByCameraChart';
import { CameraLayoutControls, CameraLayout } from './CameraLayoutControls';
import { AlertFiltersComponent, filterAlerts, defaultFilters, AlertFilters, CameraOption } from './AlertFilters';
import { SearchInput, filterCamerasBySearch, filterAlertsBySearch } from './SearchInput';
import { PaginationControls, usePagination } from './PaginationControls';
import { VideoStreamPlayer } from './VideoStreamPlayer';
import { useCameras, DbCamera } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PullToRefresh, useSwipe } from '@/components/ui/MobileInteractions';
import { exportAlerts, exportCameras } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

type AlertSortOption = 'date-desc' | 'date-asc' | 'severity-desc' | 'severity-asc' | 'type';
type ViewMode = 'cards' | 'streams' | 'hybrid';

const severityOrder: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const sortAlerts = <T extends { timestamp: string | Date; severity: string; type: string }>(
  alerts: T[],
  sortBy: AlertSortOption
): T[] => {
  return [...alerts].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'date-asc':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'severity-desc':
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      case 'severity-asc':
        return (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
      case 'type':
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });
};

// Map DB camera to UI format
function mapDbCameraToUI(dbCamera: DbCamera) {
  return {
    id: dbCamera.id,
    name: dbCamera.name,
    location: dbCamera.location,
    status: dbCamera.status,
    thumbnail: dbCamera.thumbnail || undefined,
    streamUrl: dbCamera.stream_url || undefined,
    lastActivity: dbCamera.last_activity || undefined,
    detectedPeople: dbCamera.detected_people || 0,
    alerts: dbCamera.alerts_count || 0,
    latitude: dbCamera.latitude,
    longitude: dbCamera.longitude,
  };
}

// Stream Camera Card Component
interface StreamCameraCardProps {
  camera: ReturnType<typeof mapDbCameraToUI>;
  onClick: () => void;
  compact?: boolean;
  showStream?: boolean;
}

function StreamCameraCard({ camera, onClick, compact, showStream = true }: StreamCameraCardProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    warning: 'bg-yellow-500',
    alert: 'bg-red-500 animate-pulse',
  };

  return (
    <div 
      className={cn(
        'group relative rounded-lg overflow-hidden bg-card border transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer',
        compact ? 'h-24' : 'aspect-video'
      )}
      onClick={onClick}
    >
      {/* Video Stream or Thumbnail */}
      {showStream && camera.streamUrl && !hasError ? (
        <VideoStreamPlayer
          cameraId={camera.id}
          cameraName={camera.name}
          streamUrl={camera.streamUrl}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          {camera.thumbnail ? (
            <img 
              src={camera.thumbnail} 
              alt={camera.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-12 h-12 text-muted-foreground/50" />
          )}
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Status Indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', statusColors[camera.status])} />
        {camera.status === 'alert' && (
          <Badge variant="destructive" className="text-[10px] h-5">
            ALERTA
          </Badge>
        )}
      </div>

      {/* Live Badge */}
      {showStream && camera.streamUrl && !hasError && isPlaying && (
        <Badge className="absolute top-2 right-2 bg-red-500 text-white text-[10px] h-5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />
          LIVE
        </Badge>
      )}

      {/* Controls (appear on hover) */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {showStream && camera.streamUrl && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </Button>
          </>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Maximize2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Camera Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium text-sm truncate">{camera.name}</h3>
            {camera.location && (
              <p className="text-white/70 text-xs truncate">{camera.location}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-white/80">
            {camera.detectedPeople > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Users className="w-3 h-3" />
                {camera.detectedPeople}
              </div>
            )}
            {camera.alerts > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {camera.alerts}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardComponent() {
  const navigate = useNavigate();
  const { cameras, loading: camerasLoading, updateCamera, refetch: refetchCameras } = useCameras();
  const { alerts, loading: alertsLoading, unreadCount, markAllAsRead, refetch: refetchAlerts } = useAlerts();
  const [selectedCamera, setSelectedCamera] = useState<ReturnType<typeof mapDbCameraToUI> | null>(null);
  const [cameraLayout, setCameraLayout] = useState<CameraLayout>(() => {
    return (localStorage.getItem('camera-layout') as CameraLayout) || '2x2';
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('dashboard-view-mode') as ViewMode) || 'streams';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [alertFilters, setAlertFilters] = useState<AlertFilters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertSortBy, setAlertSortBy] = useState<AlertSortOption>('date-desc');
  const [showMap, setShowMap] = useState(true);
  const [enableStreams, setEnableStreams] = useState(true);

  // Swipe navigation
  const { handleTouchStart, handleTouchEnd } = useSwipe(
    () => navigate('/cameras'), // Swipe left -> Cameras
    () => navigate('/settings') // Swipe right -> Settings
  );

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchCameras?.(), refetchAlerts?.()]);
  }, [refetchCameras, refetchAlerts]);
  
  useEffect(() => {
    localStorage.setItem('camera-layout', cameraLayout);
  }, [cameraLayout]);

  useEffect(() => {
    localStorage.setItem('dashboard-view-mode', viewMode);
  }, [viewMode]);

  const loading = camerasLoading || alertsLoading;

  const uiCameras = cameras.map(mapDbCameraToUI);
  const uiAlerts: UIAlert[] = alerts.map(a => ({
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

  // Apply search filter to cameras
  const searchedCameras = filterCamerasBySearch(uiCameras, searchQuery);
  const priorityCameras = searchedCameras.filter(c => c.status === 'alert' || c.status === 'warning');
  const normalCameras = searchedCameras.filter(c => c.status === 'online' || c.status === 'offline');

  const totalPeople = uiCameras.reduce((sum, c) => sum + (c.detectedPeople || 0), 0);
  const onlineCameras = uiCameras.filter(c => c.status !== 'offline').length;
  const activeAlerts = uiAlerts.filter(a => !a.isRead).length;
  const streamingCameras = uiCameras.filter(c => c.streamUrl).length;

  // Filter and sort alerts based on current filters, search, and sort option
  const alertsWithFilters = filterAlerts(uiAlerts.map(a => ({
    ...a,
    timestamp: a.timestamp.toISOString(),
  })), alertFilters);
  const searchedAlerts = filterAlertsBySearch(alertsWithFilters, searchQuery);
  const filteredAlerts = useMemo(() => sortAlerts(searchedAlerts, alertSortBy), [searchedAlerts, alertSortBy]);

  // Pagination for alerts
  const {
    currentPage: alertsPage,
    setCurrentPage: setAlertsPage,
    totalPages: alertsTotalPages,
    paginatedItems: paginatedAlerts,
    totalItems: alertsTotalItems,
  } = usePagination(filteredAlerts, 5);

  const getCameraGridClass = () => {
    switch (cameraLayout) {
      case '2x2': return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      case '3x3': return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';
      case 'list': return 'flex flex-col gap-2';
      default: return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    }
  };

  const handleExportAlertsCSV = () => {
    exportAlerts(alerts, 'csv');
  };

  const handleExportAlertsPDF = () => {
    exportAlerts(alerts, 'pdf');
  };

  const handleExportCamerasCSV = () => {
    exportCameras(cameras, 'csv');
  };

  const handleExportCamerasPDF = () => {
    exportCameras(cameras, 'pdf');
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div 
          className="p-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
            <StatsCard
              title="Câmeras Online"
              value={onlineCameras}
              subtitle={`de ${cameras.length} total`}
              icon={Camera}
              trend={{ value: cameras.length > 0 ? Math.round((onlineCameras / cameras.length) * 100) : 0, isPositive: true }}
            />
            <StatsCard
              title="Pessoas Detectadas"
              value={totalPeople}
              icon={Users}
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard
              title="Alertas Ativos"
              value={activeAlerts}
              icon={AlertTriangle}
              trend={{ value: 5, isPositive: false }}
              variant={activeAlerts > 5 ? 'warning' : 'default'}
            />
            <StatsCard
              title="Segurança"
              value="98%"
              icon={Shield}
              trend={{ value: 2, isPositive: true }}
            />
            <StatsCard
              title="Streams Ativos"
              value={streamingCameras}
              subtitle={`de ${cameras.length} total`}
              icon={Zap}
              trend={{ value: streamingCameras, isPositive: true }}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SearchInput 
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar câmeras ou alertas..."
              />
              <div className="flex items-center gap-2">
                <Switch 
                  id="enable-streams"
                  checked={enableStreams}
                  onCheckedChange={setEnableStreams}
                />
                <Label htmlFor="enable-streams" className="text-sm cursor-pointer">
                  Streams ao vivo
                </Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CameraLayoutControls 
                layout={cameraLayout}
                onLayoutChange={setCameraLayout}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={showMap ? 'default' : 'outline'} 
                    size="icon"
                    className="h-8 w-8"
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
              {/* Map Toggle */}
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
                  onExportCSV={handleExportCamerasCSV}
                  onExportPDF={handleExportCamerasPDF}
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
            </div>

            {/* Alerts Sidebar */}
            <div className="space-y-4 animate-fade-in-delay-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <h2 className="text-lg font-semibold text-foreground">Alertas Recentes</h2>
                </div>
                <div className="flex items-center gap-1">
                  <Select value={alertSortBy} onValueChange={(v) => setAlertSortBy(v as AlertSortOption)}>
                    <SelectTrigger className="h-7 w-[130px] text-xs">
                      <ArrowUpDown className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Mais recentes</SelectItem>
                      <SelectItem value="date-asc">Mais antigos</SelectItem>
                      <SelectItem value="severity-desc">Maior severidade</SelectItem>
                      <SelectItem value="severity-asc">Menor severidade</SelectItem>
                      <SelectItem value="type">Por tipo</SelectItem>
                    </SelectContent>
                  </Select>
                  <AlertFiltersComponent
                    filters={alertFilters}
                    onFiltersChange={setAlertFilters}
                    cameras={uiCameras.map(c => ({ id: c.id, name: c.name })) as CameraOption[]}
                  />
                  <ExportMenu
                    onExportCSV={handleExportAlertsCSV}
                    onExportPDF={handleExportAlertsPDF}
                    disabled={alerts.length === 0}
                  />
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2"
                      onClick={() => markAllAsRead()}
                    >
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Camera filter indicator */}
              {alertFilters.cameraId !== 'all' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Filtrando por: {uiCameras.find(c => c.id === alertFilters.cameraId)?.name || 'Câmera'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 ml-auto text-xs"
                    onClick={() => setAlertFilters({ ...alertFilters, cameraId: 'all' })}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                </div>
              )}

              {/* Filter summary */}
              {(alertFilters.type !== 'all' || alertFilters.severity !== 'all' || alertFilters.dateRange !== 'all') && (
                <p className="text-xs text-muted-foreground">
                  Mostrando {filteredAlerts.length} de {uiAlerts.length} alertas
                </p>
              )}
              
              <div className="space-y-3">
                {paginatedAlerts.map(alert => (
                  <AlertCard 
                    key={alert.id} 
                    alert={{
                      ...alert,
                      timestamp: new Date(alert.timestamp),
                    }}
                    searchQuery={searchQuery}
                    onCameraClick={(cameraId) => setAlertFilters({ ...alertFilters, cameraId })}
                  />
                ))}
                {filteredAlerts.length === 0 && uiAlerts.length > 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alerta corresponde aos filtros
                  </div>
                )}
                {uiAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alerta registrado
                  </div>
                )}
              </div>

              {/* Pagination */}
              {alertsTotalPages > 1 && (
                <PaginationControls
                  currentPage={alertsPage}
                  totalPages={alertsTotalPages}
                  totalItems={alertsTotalItems}
                  itemsPerPage={5}
                  onPageChange={setAlertsPage}
                  compact
                  className="mt-4"
                />
              )}

              {/* Productivity Score */}
              <div className="glass-card p-5 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Produtividade</h3>
                </div>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-primary">87%</span>
                    <span className="text-xs text-success">+3% vs ontem</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000"
                      style={{ width: '87%' }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Baseado em análise de movimentação e atividade
                </p>
              </div>
            </div>
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