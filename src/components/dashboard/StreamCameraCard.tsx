import { useState } from 'react';
import {
  Camera,
  AlertTriangle,
  Users,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UICameraData } from './types';

interface StreamCameraCardProps {
  camera: UICameraData;
  onClick: () => void;
  compact?: boolean;
  showStream?: boolean;
}

const statusColors: Record<string, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-destructive',
  warning: 'bg-accent',
  alert: 'bg-destructive animate-pulse',
};

export function StreamCameraCard({ camera, onClick, compact, showStream = true }: StreamCameraCardProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        'group relative rounded-lg overflow-hidden bg-card border transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer',
        compact ? 'h-24' : 'aspect-video'
      )}
      onClick={onClick}
      role="button"
      aria-label={`Visualizar câmera ${camera.name}`}
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
            <img src={camera.thumbnail} alt={camera.name} className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-12 h-12 text-muted-foreground/50" />
          )}
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

      {/* Status Indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', statusColors[camera.status])} />
        {camera.status === 'alert' && (
          <Badge variant="destructive" className="text-[10px] h-5">ALERTA</Badge>
        )}
      </div>

      {/* Live Badge */}
      {showStream && camera.streamUrl && !hasError && isPlaying && (
        <Badge variant="destructive" className="absolute top-2 right-2 text-[10px] h-5">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse mr-1" />
          LIVE
        </Badge>
      )}

      {/* Controls (appear on hover) */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {showStream && camera.streamUrl && (
          <>
            <Button variant="secondary" size="icon" className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}>
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button variant="secondary" size="icon" className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}>
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </Button>
          </>
        )}
        <Button variant="secondary" size="icon" className="h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <Maximize2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Camera Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground font-medium text-sm truncate drop-shadow-md">{camera.name}</h3>
            {camera.location && (
              <p className="text-muted-foreground text-xs truncate drop-shadow-md">{camera.location}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {camera.detectedPeople > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Users className="w-3 h-3" />
                {camera.detectedPeople}
              </div>
            )}
            {camera.alerts > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive">
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
