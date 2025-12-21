/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Câmeras
 * 
 * Funcionalidades:
 * - Grid de câmeras com streaming ao vivo
 * - Visualização individual expandida
 * - Controles de gravação
 * - Análise de IA por câmera
 * - Configurações por câmera
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/contexts/i18n';
import {
  Camera,
  Grid3X3,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Circle,
  Square,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Brain,
  Target,
  ScanFace,
  AlertTriangle,
  Clock,
  MapPin,
  Trash2,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  Expand,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { ClipRecorderControls } from '@/components/ClipRecorderControls';
import { FaceRecognitionOverlay } from '@/components/FaceRecognitionOverlay';
import { ZoneOverlay } from '@/components/ZoneOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type ViewMode = 'grid-1x1' | 'grid-2x2' | 'grid-3x3' | 'grid-4x4' | 'list';
type CameraStatus = 'online' | 'offline' | 'alert' | 'warning';

// Tipo alinhado com o schema do banco de dados
interface CameraData {
  id: string;
  name: string;
  location: string;
  status: CameraStatus;
  stream_url: string | null;
  thumbnail: string | null;
  detected_people: number | null;
  alerts_count: number | null;
  latitude: number | null;
  longitude: number | null;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

interface CameraStats {
  alertsToday: number;
  peopleDetected: number;
  recordingMinutes: number;
  analysisCount: number;
}

// ============================================
// COMPONENTE: Camera Card
// ============================================

interface CameraCardProps {
  camera: CameraData;
  stats?: CameraStats;
  isSelected: boolean;
  viewMode: ViewMode;
  onSelect: () => void;
  onExpand: () => void;
  onSettings: () => void;
}

function CameraCard({
  camera,
  stats,
  isSelected,
  viewMode,
  onSelect,
  onExpand,
  onSettings,
}: CameraCardProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);

  const isOnline = camera.status !== 'offline';
  const isCompact = viewMode === 'grid-4x4' || viewMode === 'list';

  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer group',
        isSelected && 'ring-2 ring-primary',
        !isOnline && 'opacity-60'
      )}
      onClick={onSelect}
    >
      {/* Video/Thumbnail */}
      <div className={cn(
        'relative bg-black',
        viewMode === 'list' ? 'aspect-video max-w-[200px]' : 'aspect-video'
      )}>
        {isOnline && camera.stream_url ? (
          <>
            <VideoStreamPlayer
              cameraId={camera.id}
              streamUrl={camera.stream_url}
              protocol="hls"
              cameraName={camera.name}
            />
            
            {/* Overlays */}
            {showOverlays && (
              <>
                <ZoneOverlay 
                  zones={[]}
                  showLabels={!isCompact}
                  showStats={!isCompact}
                />
                <FaceRecognitionOverlay 
                  faces={[]}
                  showLabels={!isCompact}
                  showSimilarity={!isCompact}
                />
              </>
            )}
          </>
        ) : camera.thumbnail ? (
          <img 
            src={camera.thumbnail} 
            alt={camera.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Camera className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Status Indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <Badge 
            variant={isOnline ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              camera.status === 'alert' && 'bg-red-500 animate-pulse'
            )}
          >
            {isOnline ? (
              camera.status === 'alert' ? (
                <><Circle className="w-2 h-2 mr-1 fill-current" /> ALERTA</>
              ) : (
                <><Wifi className="w-3 h-3 mr-1" /> Online</>
              )
            ) : (
              <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
            )}
          </Badge>
        </div>

        {/* Controls Overlay */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <ClipRecorderControls
                cameraId={camera.id}
                cameraName={camera.name}
                compact
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand();
                }}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      {viewMode !== 'grid-4x4' && (
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h3 className="font-medium truncate">{camera.name}</h3>
              {camera.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {camera.location}
                </p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExpand}>
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Expandir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats (quando não compacto) */}
          {!isCompact && stats && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {stats.alertsToday > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.alertsToday}
                </span>
              )}
              {stats.peopleDetected > 0 && (
                <span className="flex items-center gap-1">
                  <ScanFace className="w-3 h-3" />
                  {stats.peopleDetected}
                </span>
              )}
              {camera.last_activity && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(camera.last_activity), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================
// COMPONENTE: Camera Detail View (Fullscreen)
// ============================================

interface CameraDetailViewProps {
  camera: CameraData;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

function CameraDetailView({
  camera,
  isOpen,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: CameraDetailViewProps) {
  const [activeTab, setActiveTab] = useState('live');
  const [isMuted, setIsMuted] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showFaces, setShowFaces] = useState(true);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onClose, onPrev, onNext]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
        <div className="flex h-[90vh]">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col bg-black relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{camera.name}</h2>
                  {camera.location && (
                    <p className="text-white/70 text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {camera.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={camera.status !== 'offline' ? 'default' : 'secondary'}>
                    {camera.status !== 'offline' ? 'Online' : 'Offline'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Video */}
            <div className="flex-1 relative">
              {camera.stream_url ? (
                <>
                  <VideoStreamPlayer
                    cameraId={camera.id}
                    streamUrl={camera.stream_url}
                    protocol="hls"
                    cameraName={camera.name}
                    className="w-full h-full"
                  />
                  
                  {/* Overlays */}
                  {showZones && (
                    <ZoneOverlay zones={[]} showLabels showStats />
                  )}
                  {showFaces && (
                    <FaceRecognitionOverlay faces={[]} showLabels showSimilarity />
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white/70">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Stream não disponível</p>
                  </div>
                </div>
              )}

              {/* Navigation arrows */}
              {hasPrev && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70"
                  onClick={onPrev}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              )}
              {hasNext && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70"
                  onClick={onNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  
                  <ClipRecorderControls
                    cameraId={camera.id}
                    cameraName={camera.name}
                    compact
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={showZones ? 'secondary' : 'ghost'}
                    size="sm"
                    className="text-white"
                    onClick={() => setShowZones(!showZones)}
                  >
                    <Target className="w-4 h-4 mr-1" />
                    Zonas
                  </Button>
                  <Button
                    variant={showFaces ? 'secondary' : 'ghost'}
                    size="sm"
                    className="text-white"
                    onClick={() => setShowFaces(!showFaces)}
                  >
                    <ScanFace className="w-4 h-4 mr-1" />
                    Faces
                  </Button>
                  <Button
                    variant={showAnalysis ? 'secondary' : 'ghost'}
                    size="sm"
                    className="text-white"
                    onClick={() => setShowAnalysis(!showAnalysis)}
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    IA
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 bg-background border-l flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4">
                <TabsTrigger value="live">Ao Vivo</TabsTrigger>
                <TabsTrigger value="alerts">Alertas</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-4">
                <TabsContent value="live" className="m-0 space-y-4">
                  {/* Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Resolução</span>
                        <span>1920x1080</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FPS</span>
                        <span>30</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Protocolo</span>
                        <span className="uppercase">HLS</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Estatísticas Hoje</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-muted rounded text-center">
                        <p className="text-lg font-bold">0</p>
                        <p className="text-[10px] text-muted-foreground">Alertas</p>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <p className="text-lg font-bold">0</p>
                        <p className="text-[10px] text-muted-foreground">Pessoas</p>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <p className="text-lg font-bold">0</p>
                        <p className="text-[10px] text-muted-foreground">Análises</p>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <p className="text-lg font-bold">0min</p>
                        <p className="text-[10px] text-muted-foreground">Gravado</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="alerts" className="m-0">
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum alerta recente</p>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="m-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Funcionalidades</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Análise de IA</Label>
                        <Switch defaultChecked={false} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Reconhecimento Facial</Label>
                        <Switch defaultChecked={false} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Zonas de Interesse</Label>
                        <Switch defaultChecked={false} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Áudio</Label>
                        <Switch defaultChecked={false} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE PRINCIPAL: CamerasPage
// ============================================

export function CamerasPage() {
  // i18n
  const { t } = useI18n();
  
  // Estado
  const [viewMode, setViewMode] = useState<ViewMode>('grid-2x2');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [expandedCamera, setExpandedCamera] = useState<CameraData | null>(null);
  const [settingsCamera, setSettingsCamera] = useState<CameraData | null>(null);

  // Hooks
  const { cameras, loading, refetch } = useCameras();

  // Filtrar câmeras
  const filteredCameras = useMemo(() => {
    return cameras.filter(camera => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!camera.name.toLowerCase().includes(query) &&
            !camera.location?.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && camera.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [cameras, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: cameras.length,
    online: cameras.filter(c => c.status !== 'offline').length,
    alert: cameras.filter(c => c.status === 'alert').length,
    offline: cameras.filter(c => c.status === 'offline').length,
  }), [cameras]);

  // Navegação entre câmeras no modo expandido
  const currentIndex = expandedCamera 
    ? filteredCameras.findIndex(c => c.id === expandedCamera.id)
    : -1;
  
  const goToPrev = () => {
    if (currentIndex > 0) {
      setExpandedCamera(filteredCameras[currentIndex - 1]);
    }
  };
  
  const goToNext = () => {
    if (currentIndex < filteredCameras.length - 1) {
      setExpandedCamera(filteredCameras[currentIndex + 1]);
    }
  };

  // Grid classes baseado no viewMode
  const gridClasses = {
    'grid-1x1': 'grid-cols-1',
    'grid-2x2': 'grid-cols-1 md:grid-cols-2',
    'grid-3x3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    'grid-4x4': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    'list': 'flex flex-col',
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6" />
            {t('cameras.title', 'Câmeras')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.online} {t('cameras.of', 'de')} {stats.total} {t('cameras.online', 'online')}
            {stats.alert > 0 && ` • ${stats.alert} ${t('cameras.inAlert', 'em alerta')}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh', 'Atualizar')}
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t('common.add', 'Adicionar')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('cameras.searchPlaceholder', 'Buscar câmeras...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="recording">Gravando</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || statusFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}

        {/* View Mode */}
        <div className="flex items-center gap-1 border rounded-lg p-1 ml-auto">
          <Button
            variant={viewMode === 'grid-1x1' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid-1x1')}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid-2x2' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid-2x2')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid-3x3' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid-3x3')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid-4x4' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid-4x4')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        {filteredCameras.length} câmeras
      </div>

      {/* Camera Grid */}
      {filteredCameras.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma câmera encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {cameras.length === 0 
              ? 'Adicione sua primeira câmera'
              : 'Tente ajustar os filtros'}
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Câmera
          </Button>
        </div>
      ) : (
        <div className={cn('grid gap-4', gridClasses[viewMode])}>
          {filteredCameras.map(camera => (
            <CameraCard
              key={camera.id}
              camera={camera}
              isSelected={selectedCamera === camera.id}
              viewMode={viewMode}
              onSelect={() => setSelectedCamera(camera.id)}
              onExpand={() => setExpandedCamera(camera)}
              onSettings={() => setSettingsCamera(camera)}
            />
          ))}
        </div>
      )}

      {/* Camera Detail View */}
      <CameraDetailView
        camera={expandedCamera!}
        isOpen={!!expandedCamera}
        onClose={() => setExpandedCamera(null)}
        onPrev={goToPrev}
        onNext={goToNext}
        hasPrev={currentIndex > 0}
        hasNext={currentIndex < filteredCameras.length - 1}
      />

      {/* Settings Sheet */}
      <Sheet open={!!settingsCamera} onOpenChange={() => setSettingsCamera(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Configurações da Câmera</SheetTitle>
            <SheetDescription>{settingsCamera?.name}</SheetDescription>
          </SheetHeader>
          {/* TODO: Formulário de configurações */}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default CamerasPage;

