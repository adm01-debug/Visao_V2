import { useState, useEffect, useMemo } from 'react';
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
  Map
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { CameraCard } from './CameraCard';
import { AlertCard, UIAlert } from './AlertCard';
import { CameraModal } from './CameraModal';
import { ExportMenu } from './ExportMenu';
import { CameraMap } from './CameraMap';
import { CameraLayoutControls, CameraLayout } from './CameraLayoutControls';
import { AlertFiltersComponent, filterAlerts, defaultFilters, AlertFilters, CameraOption } from './AlertFilters';
import { SearchInput, filterCamerasBySearch, filterAlertsBySearch } from './SearchInput';
import { PaginationControls, usePagination } from './PaginationControls';
import { useCameras, DbCamera } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportAlerts, exportCameras } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

type AlertSortOption = 'date-desc' | 'date-asc' | 'severity-desc' | 'severity-asc' | 'type';

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
    lastActivity: dbCamera.last_activity || undefined,
    detectedPeople: dbCamera.detected_people || 0,
    alerts: dbCamera.alerts_count || 0,
    latitude: dbCamera.latitude,
    longitude: dbCamera.longitude,
  };
}

export function Dashboard() {
  const { cameras, loading: camerasLoading } = useCameras();
  const { alerts, loading: alertsLoading, unreadCount, markAllAsRead } = useAlerts();
  const [selectedCamera, setSelectedCamera] = useState<ReturnType<typeof mapDbCameraToUI> | null>(null);
  const [cameraLayout, setCameraLayout] = useState<CameraLayout>(() => {
    return (localStorage.getItem('camera-layout') as CameraLayout) || '2x2';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [alertFilters, setAlertFilters] = useState<AlertFilters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertSortBy, setAlertSortBy] = useState<AlertSortOption>('date-desc');
  const [showMap, setShowMap] = useState(true);
  useEffect(() => {
    localStorage.setItem('camera-layout', cameraLayout);
  }, [cameraLayout]);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <StatsCard
            title="Câmeras Online"
            value={`${onlineCameras}/${uiCameras.length}`}
            subtitle={`${uiCameras.length - onlineCameras} câmeras offline`}
            icon={Camera}
            variant="primary"
            trend={{ value: 2, isPositive: true }}
          />
          <StatsCard
            title="Alertas Ativos"
            value={activeAlerts}
            subtitle={`${uiAlerts.length} total`}
            icon={AlertTriangle}
            variant="danger"
          />
          <StatsCard
            title="Pessoas Detectadas"
            value={totalPeople}
            subtitle="Em tempo real"
            icon={Users}
            variant="default"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Score de Segurança"
            value="94%"
            subtitle="Excelente"
            icon={Shield}
            variant="success"
          />
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4 animate-fade-in">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar câmeras e alertas..."
            className="flex-1 max-w-md"
          />
          {searchQuery && (
            <p className="text-sm text-muted-foreground">
              {searchedCameras.length} câmeras • {filteredAlerts.length} alertas encontrados
            </p>
          )}
        </div>

        {/* Camera Map Section */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Mapa das Câmeras</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? 'Ocultar mapa' : 'Mostrar mapa'}
            </Button>
          </div>
          {showMap && (
            <CameraMap
              cameras={uiCameras}
              onCameraClick={(cameraId) => {
                const camera = uiCameras.find(c => c.id === cameraId);
                if (camera) setSelectedCamera(camera);
              }}
              className="h-[300px]"
            />
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cameras Section */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in-delay-1">
            {/* Camera Controls */}
            <div className="flex items-center justify-between">
              <CameraLayoutControls
                layout={cameraLayout}
                onLayoutChange={setCameraLayout}
                onFullscreen={toggleFullscreen}
              />
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
                    <CameraCard 
                      key={camera.id} 
                      camera={camera} 
                      onClick={() => setSelectedCamera(camera)}
                      compact={cameraLayout === 'list'}
                      searchQuery={searchQuery}
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
                  <CameraCard 
                    key={camera.id} 
                    camera={camera}
                    onClick={() => setSelectedCamera(camera)}
                    compact={cameraLayout === 'list'}
                    searchQuery={searchQuery}
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
        />
      )}
    </>
  );
}
