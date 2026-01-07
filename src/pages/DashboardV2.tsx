import { ErrorBoundary } from "@/components/ErrorBoundary";
import { unique } from '@/lib/arrayUtils';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { CardSkeleton } from '@/components/CardSkeleton';
import { APP_NAME } from '@/lib/constants';
import { formatNumber } from '@/lib/formatters';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { StatCard } from '@/components/StatCard';
import { CountUp } from '@/components/CountUp';
import { TimeAgo } from '@/components/TimeAgo';
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Dashboard V2 - Integração Completa
 * 
 * Melhorias integradas:
 * - VideoStreamPlayer em vez de thumbnails estáticos
 * - StreamingCameraGrid com layouts dinâmicos
 * - ClipRecorderControls para gravação
 * - ZoneOverlay para visualização de zonas
 * - FaceRecognitionOverlay para detecção facial
 * - Análise contínua por câmera
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Video,
  Grid3X3,
  LayoutGrid,
  List,
  Maximize2,
  Play,
  Square,
  Brain,
  ScanFace,
  Target,
  Settings2,
  RefreshCw,
} from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { AlertCard, UIAlert } from '@/components/AlertCard';
import { CameraModal } from '@/components/CameraModal';
import { ExportMenu } from '@/components/ExportMenu';
import { CameraMap } from '@/components/CameraMap';
import { AlertTrendsChart } from '@/components/AlertTrendsChart';
import { AlertsByCameraChart } from '@/components/AlertsByCameraChart';
import { AlertFiltersComponent, filterAlerts, defaultFilters, AlertFilters, CameraOption } from '@/components/AlertFilters';
import { SearchInput, filterCamerasBySearch, filterAlertsBySearch } from '@/components/SearchInput';
import { PaginationControls, usePagination } from '@/components/PaginationControls';

// Novos componentes integrados (GAP #1-5)
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { StreamingCameraGrid } from '@/components/StreamingCameraGrid';
import { ClipRecorderControls } from '@/components/ClipRecorderControls';
import { ZoneOverlay } from '@/components/ZoneOverlay';
import { FaceRecognitionOverlay } from '@/components/FaceRecognitionOverlay';
import { ContinuousAnalysisPanel } from '@/components/ContinuousAnalysisPanel';
import { OnboardingTour } from '@/components/OnboardingTour';

// Hooks
import { useCameras, DbCamera } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { useVideoStream } from '@/hooks/useVideoStream';
import { useClipRecorder } from '@/hooks/useClipRecorder';
import { useZoneDetection } from '@/hooks/useZoneDetection';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { useContinuousAnalysis } from '@/hooks/useContinuousAnalysis';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { exportAlerts, exportCameras } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type AlertSortOption = 'date-desc' | 'date-asc' | 'severity-desc' | 'severity-asc' | 'type';
type ViewMode = 'grid' | 'stream' | 'map' | 'analytics';
type GridLayout = '1x1' | '2x2' | '3x3' | '4x4' | 'list';

interface DashboardSettings {
  viewMode: ViewMode;
  gridLayout: GridLayout;
  showMap: boolean;
  showStats: boolean;
  showAlerts: boolean;
  enableStreaming: boolean;
  enableAnalysis: boolean;
  enableFaceRecognition: boolean;
  enableZones: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

const defaultSettings: DashboardSettings = {
  viewMode: 'grid',
  gridLayout: '2x2',
  showMap: true,
  showStats: true,
  showAlerts: true,
  enableStreaming: true,
  enableAnalysis: false,
  enableFaceRecognition: false,
  enableZones: true,
  autoRefresh: true,
  refreshInterval: 30000,
};

// ============================================
// HELPERS
// ============================================

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
    streamUrl: (dbCamera as unknown).stream_url || undefined,
    streamProtocol: (dbCamera as unknown).stream_protocol || 'hls',
  };
}

// ============================================
// COMPONENTE: Camera Stream Card
// ============================================

interface CameraStreamCardProps {
  camera: ReturnType<typeof mapDbCameraToUI>;
  isSelected: boolean;
  onClick: () => void;
  settings: DashboardSettings;
  compact?: boolean;
}

function CameraStreamCard({ 
  camera, 
  isSelected, 
  onClick, 
  settings,
  compact = false,
}: CameraStreamCardProps) {
  const hasStream = camera.streamUrl && settings.enableStreaming;
  const hasAlerts = camera.alerts > 0;
  const isOnline = camera.status === 'online' || camera.status === 'alert';

  // Hooks para funcionalidades avançadas
  const { zones, stats: zoneStats } = useZoneDetection({
    cameraId: camera.id,
    cameraName: camera.name,
  });

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300',
        'border bg-card hover:shadow-lg',
        isSelected && 'ring-2 ring-primary',
        hasAlerts && 'border-destructive/50',
        compact ? 'h-24' : 'aspect-video'
      )}
      onClick={onClick}
    >
      {/* Video Stream ou Thumbnail */}
      {hasStream && isOnline ? (
        <div role="main" aria-label="Painel de controle principal" className="absolute inset-0">
          <VideoStreamPlayer
            cameraId={camera.id}
            streamUrl={camera.streamUrl!}
            protocol={camera.streamProtocol as unknown}
            cameraName={camera.name}
          />
          
          {/* Zone Overlay */}
          {settings.enableZones && zones.length > 0 && (
            <ZoneOverlay
              zones={zones}
              showStats={false}
              showLabels
            />
          )}
        </div>
      ) : (
        <div role="main" aria-label="Painel de controle principal" className="absolute inset-0">
          {camera.thumbnail ? (
            <img
              src={camera.thumbnail}
              alt={camera.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div role="main" aria-label="Painel de controle principal" className="w-full h-full bg-muted flex items-center justify-center">
              <Camera className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Gradient overlay */}
      <div role="main" aria-label="Painel de controle principal" className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Status badges */}
      <div role="main" aria-label="Painel de controle principal" className="absolute top-2 left-2 flex items-center gap-2">
        {/* Status */}
        <Badge
          variant={isOnline ? 'default' : 'destructive'}
          className={cn(
            'text-[10px] px-1.5 py-0.5',
            isOnline && 'bg-green-500'
          )}
        >
          {isOnline ? 'AO VIVO' : 'OFFLINE'}
        </Badge>

        {/* Streaming indicator */}
        {hasStream && isOnline && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
            <div role="main" aria-label="Painel de controle principal" className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            REC
          </Badge>
        )}

        {/* Analysis indicator */}
        {settings.enableAnalysis && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-background/50">
            <Brain className="w-2.5 h-2.5 mr-0.5" />
            IA
          </Badge>
        )}
      </div>

      {/* Alert count */}
      {hasAlerts && (
        <div role="main" aria-label="Painel de controle principal" className="absolute top-2 right-2">
          <Badge variant="destructive" className="text-[10px] animate-pulse">
            {camera.alerts} alertas
          </Badge>
        </div>
      )}

      {/* Bottom info */}
      <div role="main" aria-label="Painel de controle principal" className="absolute bottom-0 left-0 right-0 p-3">
        <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white text-sm truncate">{camera.name}</h3>
            <p className="text-[10px] text-white/70 truncate">{camera.location}</p>
          </div>
          <div role="main" aria-label="Painel de controle principal" className="flex items-center gap-1 text-white/80">
            <Users className="w-3 h-3" />
            <span className="text-xs">{camera.detectedPeople}</span>
          </div>
        </div>
      </div>

      {/* Quick actions (on hover) */}
      <div role="main" aria-label="Painel de controle principal" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <Button aria-label="Ação" size="icon" variant="secondary" className="h-8 w-8">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Settings Sheet
// ============================================

interface SettingsSheetProps {
  settings: DashboardSettings;
  onSettingsChange: (settings: DashboardSettings) => void;
}

function SettingsSheet({ settings, onSettingsChange }: SettingsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button aria-label="Ação" variant="outline" size="icon">
          <Settings2 className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Configurações do Dashboard</SheetTitle>
          <SheetDescription>
            Configure as funcionalidades e visualização
          </SheetDescription>
        </SheetHeader>
        
        <div role="main" aria-label="Painel de controle principal" className="space-y-6 mt-6">
          {/* Streaming */}
          <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between">
            <div role="main" aria-label="Painel de controle principal" className="space-y-0.5">
              <Label>Streaming ao Vivo</Label>
              <p className="text-xs text-muted-foreground">Exibir vídeo em tempo real</p>
            </div>
            <Switch
              checked={settings.enableStreaming}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableStreaming: checked })
              }
            />
          </div>

          {/* Analysis */}
          <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between">
            <div role="main" aria-label="Painel de controle principal" className="space-y-0.5">
              <Label>Análise Contínua</Label>
              <p className="text-xs text-muted-foreground">Análise automática por IA</p>
            </div>
            <Switch
              checked={settings.enableAnalysis}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableAnalysis: checked })
              }
            />
          </div>

          {/* Face Recognition */}
          <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between">
            <div role="main" aria-label="Painel de controle principal" className="space-y-0.5">
              <Label>Reconhecimento Facial</Label>
              <p className="text-xs text-muted-foreground">Detectar e identificar rostos</p>
            </div>
            <Switch
              checked={settings.enableFaceRecognition}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableFaceRecognition: checked })
              }
            />
          </div>

          {/* Zones */}
          <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between">
            <div role="main" aria-label="Painel de controle principal" className="space-y-0.5">
              <Label>Zonas de Interesse</Label>
              <p className="text-xs text-muted-foreground">Exibir zonas sobre o vídeo</p>
            </div>
            <Switch
              checked={settings.enableZones}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableZones: checked })
              }
            />
          </div>

          <div role="main" aria-label="Painel de controle principal" className="border-t pt-4">
            {/* Auto Refresh */}
            <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between">
              <div role="main" aria-label="Painel de controle principal" className="space-y-0.5">
                <Label>Atualização Automática</Label>
                <p className="text-xs text-muted-foreground">Recarregar dados periodicamente</p>
              </div>
              <Switch
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => 
                  onSettingsChange({ ...settings, autoRefresh: checked })
                }
              />
            </div>

            {settings.autoRefresh && (
              <div role="main" aria-label="Painel de controle principal" className="mt-4">
                <Label>Intervalo (segundos)</Label>
                <Select
                  value={String(settings.refreshInterval / 1000)}
                  onValueChange={(v) => 
                    onSettingsChange({ ...settings, refreshInterval: Number(v) * 1000 })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 segundos</SelectItem>
                    <SelectItem value="30">30 segundos</SelectItem>
                    <SelectItem value="60">1 minuto</SelectItem>
                    <SelectItem value="300">5 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function DashboardV2() {
  
  // Estado
  const [selectedCamera, setSelectedCamera] = useState<ReturnType<typeof mapDbCameraToUI> | null>(null);
  const [alertFilters, setAlertFilters] = useState<AlertFilters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertSortBy, setAlertSortBy] = useState<AlertSortOption>('date-desc');
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    const saved = localStorage.getItem('dashboard-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  // Hooks de dados
  const { cameras, loading: camerasLoading, updateCamera, refetch: refetchCameras } = useCameras();
  const { alerts, loading: alertsLoading, unreadCount, markAllAsRead, refetch: refetchAlerts } = useAlerts();

  // Persistir settings
  useEffect(() => {
    localStorage.setItem('dashboard-settings', JSON.stringify(settings));
  }, [settings]);

  // Auto refresh
  useEffect(() => {
    if (!settings.autoRefresh) return;
    
    const interval = setInterval(() => {
      refetchCameras();
      refetchAlerts();
    }, settings.refreshInterval);

    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refreshInterval, refetchCameras, refetchAlerts]);

  // Dados processados
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

  // Filtros
  const searchedCameras = filterCamerasBySearch(uiCameras, searchQuery);
  const priorityCameras = searchedCameras.filter(c => c.status === 'alert' || c.status === 'warning');
  const normalCameras = searchedCameras.filter(c => c.status === 'online' || c.status === 'offline');

  // Stats
  const totalPeople = uiCameras.reduce((sum, c) => sum + (c.detectedPeople || 0), 0);
  const onlineCameras = uiCameras.filter(c => c.status !== 'offline').length;
  const activeAlerts = uiAlerts.filter(a => !a.isRead).length;
  const streamingCameras = uiCameras.filter(c => c.streamUrl).length;

  // Alertas filtrados
  const alertsWithFilters = filterAlerts(uiAlerts.map(a => ({
    ...a,
    timestamp: a.timestamp.toISOString(),
  })), alertFilters);
  const searchedAlerts = filterAlertsBySearch(alertsWithFilters, searchQuery);
  const filteredAlerts = useMemo(() => sortAlerts(searchedAlerts, alertSortBy), [searchedAlerts, alertSortBy]);

  // Paginação
  const {
    currentPage: alertsPage,
    setCurrentPage: setAlertsPage,
    totalPages: alertsTotalPages,
    paginatedItems: paginatedAlerts,
    totalItems: alertsTotalItems,
  } = usePagination(filteredAlerts, 5);

  // Grid class
  const getGridClass = () => {
    switch (settings.gridLayout) {
      case '1x1': return 'grid grid-cols-1 gap-4';
      case '2x2': return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      case '3x3': return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';
      case '4x4': return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2';
      case 'list': return 'flex flex-col gap-2';
      default: return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    }
  };

  // Handlers
  const handleRefresh = useCallback(() => {
    refetchCameras();
    refetchAlerts();
    toast.success('Dados atualizados');
  }, [refetchCameras, refetchAlerts]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div role="main" aria-label="Painel de controle principal" className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
        <div role="main" aria-label="Painel de controle principal" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-4 sm:space-y-6 overflow-auto h-[calc(100vh-4rem)] mb-mobile-nav">
      {/* Header com controles - responsivo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {uiCameras.length} câmeras • {streamingCameras} com streaming
          </p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* View mode tabs - oculto em mobile pequeno */}
          <Tabs
            value={settings.viewMode}
            onValueChange={(v) => setSettings(s => ({ ...s, viewMode: v as ViewMode }))}
            className="hidden sm:block"
          >
            <TabsList className="h-9">
              <TabsTrigger value="grid" className="h-7 px-3">
                <LayoutGrid className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="stream" className="h-7 px-3">
                <Video className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="map" className="h-7 px-3">
                <Map className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Layout selector */}
          <Select
            value={settings.gridLayout}
            onValueChange={(v) => setSettings(s => ({ ...s, gridLayout: v as GridLayout }))}
          >
            <SelectTrigger className="w-20 sm:w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1x1">1x1</SelectItem>
              <SelectItem value="2x2">2x2</SelectItem>
              <SelectItem value="3x3">3x3</SelectItem>
              <SelectItem value="4x4">4x4</SelectItem>
              <SelectItem value="list">Lista</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={handleRefresh} className="shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Fullscreen - oculto em mobile */}
          <Button variant="outline" size="icon" onClick={toggleFullscreen} className="hidden sm:inline-flex shrink-0">
            <Maximize2 className="w-4 h-4" />
          </Button>

          {/* Settings */}
          <SettingsSheet settings={settings} onSettingsChange={setSettings} />
        </div>
      </div>

      {/* Stats Grid - responsivo com classe utilitária */}
      {settings.showStats && (
        <div className="stats-grid animate-fade-in">
          <StatsCard
            title="Câmeras"
            value={`${onlineCameras}/${uiCameras.length}`}
            subtitle="online"
            icon={Camera}
            variant="primary"
          />
          <StatsCard
            title="Alertas"
            value={activeAlerts}
            subtitle={`${uiAlerts.length} total`}
            icon={AlertTriangle}
            variant="danger"
          />
          <StatsCard
            title="Pessoas"
            value={totalPeople}
            subtitle="detectadas"
            icon={Users}
            variant="default"
          />
          <StatsCard
            title="Segurança"
            value="94%"
            subtitle="score"
            icon={Shield}
            variant="success"
          />
          <StatsCard
            title="IA"
            value={settings.enableAnalysis ? 'Ativa' : 'Não'}
            subtitle={settings.enableFaceRecognition ? 'Face+' : 'Básica'}
            icon={Brain}
            variant={settings.enableAnalysis ? 'success' : 'default'}
          />
        </div>
      )}

      {/* Search */}
      <div role="main" aria-label="Painel de controle principal" className="flex items-center gap-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar câmeras e alertas..."
          className="flex-1 max-w-md"
        />
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            {searchedCameras.length} câmeras • {filteredAlerts.length} alertas
          </p>
        )}
      </div>

      {/* Main Content */}
      <div role="main" aria-label="Painel de controle principal" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cameras Grid - 3 cols */}
        <div role="main" aria-label="Painel de controle principal" className="lg:col-span-3 space-y-4">
          {/* Priority cameras */}
          {priorityCameras.length > 0 && (
            <div>
              <div role="main" aria-label="Painel de controle principal" className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h2 className="font-semibold">Câmeras com Alertas</h2>
                <Badge variant="destructive">{priorityCameras.length}</Badge>
              </div>
              <div className={getGridClass()}>
                {priorityCameras.map(camera => (
                  <CameraStreamCard
                    key={camera.id}
                    camera={camera}
                    isSelected={selectedCamera?.id === camera.id}
                    onClick={() => setSelectedCamera(camera)}
                    settings={settings}
                    compact={settings.gridLayout === 'list'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Normal cameras */}
          <div>
            <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between mb-3">
              <div role="main" aria-label="Painel de controle principal" className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Todas as Câmeras</h2>
                <Badge variant="secondary">{normalCameras.length}</Badge>
              </div>
              <ExportMenu
                onExportCSV={() => exportCameras(cameras, 'csv')}
                onExportPDF={() => exportCameras(cameras, 'pdf')}
                disabled={cameras.length === 0}
              />
            </div>
            <div className={getGridClass()}>
              {normalCameras.map(camera => (
                <CameraStreamCard
                  key={camera.id}
                  camera={camera}
                  isSelected={selectedCamera?.id === camera.id}
                  onClick={() => setSelectedCamera(camera)}
                  settings={settings}
                  compact={settings.gridLayout === 'list'}
                />
              ))}
            </div>
          </div>

          {/* Map (opcional) */}
          {settings.showMap && settings.viewMode === 'map' && (
            <div>
              <div role="main" aria-label="Painel de controle principal" className="flex items-center gap-2 mb-3">
                <Map className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Mapa das Câmeras</h2>
              </div>
              <CameraMap
                cameras={uiCameras}
                onCameraClick={(id) => {
                  const camera = uiCameras.find(c => c.id === id);
                  if (camera) setSelectedCamera(camera);
                }}
                className="h-[400px] rounded-xl"
              />
            </div>
          )}

          {/* Charts */}
          <div role="main" aria-label="Painel de controle principal" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AlertTrendsChart alerts={uiAlerts} />
            <AlertsByCameraChart 
              alerts={uiAlerts} 
              onCameraClick={(cameraId) => {
                setAlertFilters(prev => ({ ...prev, cameraId }));
              }}
            />
          </div>
        </div>

        {/* Sidebar - Alerts */}
        <div role="main" aria-label="Painel de controle principal" className="space-y-4">
          <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between">
            <div role="main" aria-label="Painel de controle principal" className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h2 className="font-semibold">Alertas</h2>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </div>
            <div role="main" aria-label="Painel de controle principal" className="flex items-center gap-1">
              <Select value={alertSortBy} onValueChange={(v) => setAlertSortBy(v as AlertSortOption)}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Recentes</SelectItem>
                  <SelectItem value="severity-desc">Severidade</SelectItem>
                  <SelectItem value="type">Tipo</SelectItem>
                </SelectContent>
              </Select>
              {unreadCount > 0 && (
                <Button aria-label="Ação" variant="ghost" size="sm" className="h-7" onClick={() => markAllAsRead()}>
                  <CheckCheck className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div role="main" aria-label="Painel de controle principal" className="space-y-2">
            {paginatedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={{
                  ...alert,
                  timestamp: new Date(alert.timestamp),
                }}
                searchQuery={searchQuery}
              />
            ))}
            {filteredAlerts.length === 0 && (
              <div role="main" aria-label="Painel de controle principal" className="text-center py-8 text-muted-foreground text-sm">
                Nenhum alerta
              </div>
            )}
          </div>

          {alertsTotalPages > 1 && (
            <PaginationControls
              currentPage={alertsPage}
              totalPages={alertsTotalPages}
              totalItems={alertsTotalItems}
              itemsPerPage={5}
              onPageChange={setAlertsPage}
              compact
            />
          )}

          {/* Productivity */}
          <div role="main" aria-label="Painel de controle principal" className="glass-card p-4 mt-4">
            <div role="main" aria-label="Painel de controle principal" className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Produtividade</h3>
            </div>
            <div role="main" aria-label="Painel de controle principal" className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-primary">87%</span>
              <Badge variant="outline" className="text-green-500 border-green-500">
                +3%
              </Badge>
            </div>
            <div role="main" aria-label="Painel de controle principal" className="h-2 bg-secondary rounded-full overflow-hidden">
              <div role="main" aria-label="Painel de controle principal" className="h-full bg-primary rounded-full" style={{ width: '87%' }} />
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

      {/* Onboarding Tour para novos usuários */}
      <OnboardingTour autoStart={true} />
    </div>
  );
}

export default DashboardV2;
