/**
 * VISÃO - Sistema de Vigilância Inteligente
 * MultiCameraView Component
 */

import { memo, useState, useCallback } from 'react';
import { 
  Camera, 
  Maximize2, 
  Minimize2, 
  Grid, 
  LayoutGrid,
  Volume2,
  VolumeX,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CameraStream {
  id: string;
  name: string;
  streamUrl?: string;
  thumbnail?: string;
  status: 'online' | 'offline' | 'warning' | 'alert';
  detectedPeople?: number;
}

type LayoutMode = '1x1' | '2x2' | '3x3' | '4x4';

interface MultiCameraViewProps {
  cameras: CameraStream[];
  onCameraClick?: (camera: CameraStream) => void;
  onCameraDoubleClick?: (camera: CameraStream) => void;
  defaultLayout?: LayoutMode;
  className?: string;
}

const layoutConfig: Record<LayoutMode, { cols: number; label: string }> = {
  '1x1': { cols: 1, label: '1 câmera' },
  '2x2': { cols: 2, label: '4 câmeras' },
  '3x3': { cols: 3, label: '9 câmeras' },
  '4x4': { cols: 4, label: '16 câmeras' },
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-red-500',
  warning: 'bg-yellow-500',
  alert: 'bg-red-500 animate-pulse',
};

function MultiCameraViewComponent({
  cameras,
  onCameraClick,
  onCameraDoubleClick,
  defaultLayout = '2x2',
  className
}: MultiCameraViewProps) {
  const [layout, setLayout] = useState<LayoutMode>(defaultLayout);
  const [fullscreenCamera, setFullscreenCamera] = useState<string | null>(null);
  const [mutedCameras, setMutedCameras] = useState<Set<string>>(new Set());
  const [pausedCameras, setPausedCameras] = useState<Set<string>>(new Set());

  const toggleMute = useCallback((cameraId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedCameras(prev => {
      const next = new Set(prev);
      if (next.has(cameraId)) {
        next.delete(cameraId);
      } else {
        next.add(cameraId);
      }
      return next;
    });
  }, []);

  const togglePause = useCallback((cameraId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPausedCameras(prev => {
      const next = new Set(prev);
      if (next.has(cameraId)) {
        next.delete(cameraId);
      } else {
        next.add(cameraId);
      }
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback((cameraId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFullscreenCamera(prev => prev === cameraId ? null : cameraId);
  }, []);

  const displayedCameras = fullscreenCamera 
    ? cameras.filter(c => c.id === fullscreenCamera)
    : cameras.slice(0, layoutConfig[layout].cols ** 2);

  const gridCols = fullscreenCamera ? 1 : layoutConfig[layout].cols;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <span className="font-medium">Monitoramento ao Vivo</span>
          <Badge variant="secondary">{cameras.length} câmeras</Badge>
        </div>

        <div className="flex items-center gap-2">
          {(['1x1', '2x2', '3x3', '4x4'] as LayoutMode[]).map((l) => (
            <Button
              key={l}
              variant={layout === l && !fullscreenCamera ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setLayout(l);
                setFullscreenCamera(null);
              }}
              disabled={!!fullscreenCamera}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      {/* Camera Grid */}
      <div 
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
      >
        {displayedCameras.map((camera) => {
          const isMuted = mutedCameras.has(camera.id);
          const isPaused = pausedCameras.has(camera.id);
          const isFullscreen = fullscreenCamera === camera.id;

          return (
            <div
              key={camera.id}
              className={cn(
                "relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer group",
                camera.status === 'alert' && 'ring-2 ring-destructive',
                isFullscreen && 'col-span-full row-span-full'
              )}
              onClick={() => onCameraClick?.(camera)}
              onDoubleClick={() => onCameraDoubleClick?.(camera)}
            >
              {/* Video/Thumbnail */}
              {camera.thumbnail ? (
                <img 
                  src={camera.thumbnail} 
                  alt={camera.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Camera className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Status indicator */}
              <div className="absolute top-2 left-2 flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", statusColors[camera.status])} />
                {camera.status === 'online' && !isPaused && (
                  <Badge className="bg-red-500 text-white text-[10px] h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />
                    LIVE
                  </Badge>
                )}
              </div>

              {/* Controls (hover) */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => togglePause(camera.id, e)}
                >
                  {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => toggleMute(camera.id, e)}
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => toggleFullscreen(camera.id, e)}
                >
                  {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </Button>
              </div>

              {/* Camera info */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white text-sm font-medium truncate">{camera.name}</p>
                {camera.detectedPeople !== undefined && camera.detectedPeople > 0 && (
                  <p className="text-white/70 text-xs">{camera.detectedPeople} pessoas</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {cameras.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Camera className="w-16 h-16 mb-4 opacity-50" />
          <p>Nenhuma câmera configurada</p>
        </div>
      )}
    </div>
  );
}

export const MultiCameraView = memo(MultiCameraViewComponent);
