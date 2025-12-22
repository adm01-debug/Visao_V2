import { useMediaQuery, useWindowSize } from "@/hooks";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: StreamingCameraGrid
 * 
 * Grid de câmeras com streaming em tempo real.
 * Suporta layouts 2x2, 3x3, 4x4 e lista.
 * Permite seleção de câmera para visualização expandida.
 */

import { useState, useMemo } from 'react';
import { 
  Grid2X2, 
  Grid3X3, 
  LayoutGrid, 
  List, 
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Camera as CameraIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoStreamPlayer } from './VideoStreamPlayer';
import { DbCamera } from '@/hooks/useCameras';

// ============================================
// TIPOS
// ============================================

type GridLayout = '2x2' | '3x3' | '4x4' | 'list' | 'single';

interface StreamingCameraGridProps {
  /** Lista de câmeras */
  cameras: DbCamera[];
  
  /** Layout inicial */
  initialLayout?: GridLayout;
  
  /** Mostrar controles de layout */
  showLayoutControls?: boolean;
  
  /** Altura máxima do grid */
  maxHeight?: string | number;
  
  /** Callback ao selecionar câmera */
  onCameraSelect?: (camera: DbCamera) => void;
  
  /** Callback ao tirar snapshot */
  onSnapshot?: (cameraId: string, imageData: string) => void;
  
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// LAYOUT SELECTOR
// ============================================

function LayoutSelector({
  current,
  onChange,
}: {
  current: GridLayout;
  onChange: (layout: GridLayout) => void;
}) {
  const layouts: { value: GridLayout; icon: React.ReactNode; label: string }[] = [
    { value: '2x2', icon: <Grid2X2 className="w-4 h-4" />, label: '2x2' },
    { value: '3x3', icon: <Grid3X3 className="w-4 h-4" />, label: '3x3' },
    { value: '4x4', icon: <LayoutGrid className="w-4 h-4" />, label: '4x4' },
    { value: 'list', icon: <List className="w-4 h-4" />, label: 'Lista' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
        {layouts.map(({ value, icon, label }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <Button
                variant={current === value ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onChange(value)}
              >
                {icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// ============================================
// CAMERA TILE (Mini player)
// ============================================

function CameraTile({
  camera,
  isSelected,
  showStream,
  onSelect,
  onExpand,
  compact,
}: {
  camera: DbCamera;
  isSelected: boolean;
  showStream: boolean;
  onSelect: () => void;
  onExpand: () => void;
  compact?: boolean;
}) {
  const hasAlerts = (camera.alerts_count || 0) > 0;
  const isOnline = camera.status === 'online' || camera.status === 'alert';

  if (compact) {
    // Layout lista
    return (
      <div
        className={cn(
          'glass-card p-3 cursor-pointer transition-all hover:border-primary/50 flex items-center gap-4',
          isSelected && 'border-primary',
          hasAlerts && 'border-destructive/50'
        )}
        onClick={onSelect}
      >
        {/* Mini preview */}
        <div className="relative w-32 h-20 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
          {showStream && isOnline ? (
            <VideoStreamPlayer
              cameraId={camera.id}
              cameraName={camera.name}
              height="100%"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CameraIcon className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{camera.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{camera.location}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={isOnline ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                camera.status === 'alert' && 'bg-destructive'
              )}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            {hasAlerts && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {camera.alerts_count}
              </Badge>
            )}
          </div>
        </div>

        {/* Expand button */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Layout grid
  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 group',
        isSelected && 'ring-2 ring-primary',
        hasAlerts && 'ring-2 ring-destructive/50'
      )}
      onClick={onSelect}
    >
      {/* Video player */}
      {showStream && isOnline ? (
        <VideoStreamPlayer
          cameraId={camera.id}
          cameraName={camera.name}
          location={camera.location}
        />
      ) : (
        <div className="aspect-video bg-secondary flex items-center justify-center">
          <div className="text-center">
            <CameraIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{camera.name}</p>
            <p className="text-xs text-muted-foreground/70">{camera.location}</p>
          </div>
        </div>
      )}

      {/* Expand button (hover) */}
      <Button
        variant="secondary"
        size="sm"
        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
      >
        <Maximize2 className="w-4 h-4" />
      </Button>

      {/* Alerts badge */}
      {hasAlerts && (
        <Badge
          variant="destructive"
          className="absolute top-2 left-2 gap-1"
        >
          <AlertTriangle className="w-3 h-3" />
          {camera.alerts_count}
        </Badge>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function StreamingCameraGrid({
  cameras,
  initialLayout = '2x2',
  showLayoutControls = true,
  maxHeight,
  onCameraSelect,
  onSnapshot,
  className,
}: StreamingCameraGridProps) {
  const [layout, setLayout] = useState<GridLayout>(initialLayout);
  const [selectedCamera, setSelectedCamera] = useState<DbCamera | null>(null);
  const [expandedCamera, setExpandedCamera] = useState<DbCamera | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Calcular câmeras por página baseado no layout
  const camerasPerPage = useMemo(() => {
    switch (layout) {
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      case 'list': return 10;
      case 'single': return 1;
      default: return 4;
    }
  }, [layout]);

  // Paginação
  const totalPages = Math.ceil(cameras.length / camerasPerPage);
  const paginatedCameras = useMemo(() => {
    const start = currentPage * camerasPerPage;
    return cameras.slice(start, start + camerasPerPage);
  }, [cameras, currentPage, camerasPerPage]);

  // Grid class baseado no layout
  const gridClass = useMemo(() => {
    switch (layout) {
      case '2x2': return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      case '3x3': return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';
      case '4x4': return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2';
      case 'list': return 'flex flex-col gap-2';
      case 'single': return '';
      default: return 'grid grid-cols-2 gap-4';
    }
  }, [layout]);

  const handleCameraSelect = (camera: DbCamera) => {
    setSelectedCamera(camera);
    onCameraSelect?.(camera);
  };

  const handleExpand = (camera: DbCamera) => {
    setExpandedCamera(camera);
  };

  const handleSnapshot = (cameraId: string, imageData: string) => {
    onSnapshot?.(cameraId, imageData);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CameraIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Câmeras ao Vivo</h2>
          <Badge variant="secondary">{cameras.length}</Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Layout selector */}
          {showLayoutControls && (
            <LayoutSelector current={layout} onChange={setLayout} />
          )}
        </div>
      </div>

      {/* Grid de câmeras */}
      <div
        className={gridClass}
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        {paginatedCameras.map(camera => (
          <CameraTile
            key={camera.id}
            camera={camera}
            isSelected={selectedCamera?.id === camera.id}
            showStream={true}
            onSelect={() => handleCameraSelect(camera)}
            onExpand={() => handleExpand(camera)}
            compact={layout === 'list'}
          />
        ))}
      </div>

      {/* Empty state */}
      {cameras.length === 0 && (
        <div className="text-center py-12">
          <CameraIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhuma câmera cadastrada</p>
        </div>
      )}

      {/* Modal de câmera expandida */}
      <Dialog open={!!expandedCamera} onOpenChange={() => setExpandedCamera(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">
                {expandedCamera?.name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => setExpandedCamera(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          
          {expandedCamera && (
            <VideoStreamPlayer
              cameraId={expandedCamera.id}
              cameraName={expandedCamera.name}
              location={expandedCamera.location}
              showStats={true}
              onSnapshot={(data) => handleSnapshot(expandedCamera.id, data)}
              height={600}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StreamingCameraGrid;
