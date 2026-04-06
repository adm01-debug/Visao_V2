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
  Brain,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CameraPlaceholder } from '@/components/cameras/CameraPlaceholder';
import type { UICameraData } from './types';

interface StreamCameraCardProps {
  camera: UICameraData;
  onClick: () => void;
  compact?: boolean;
  showStream?: boolean;
  aiAnalysisActive?: boolean;
  onToggleAiAnalysis?: (cameraId: string, active: boolean) => void;
}

const statusConfig: Record<string, { dot: string; label: string; badge?: string }> = {
  online: { dot: 'bg-success', label: 'AO VIVO', badge: 'bg-success/15 text-success border-success/25' },
  offline: { dot: 'bg-muted-foreground', label: 'OFFLINE', badge: 'bg-muted text-muted-foreground border-border' },
  warning: { dot: 'bg-warning', label: 'ATENÇÃO', badge: 'bg-warning/12 text-warning border-warning/20' },
  alert: { dot: 'bg-destructive animate-pulse', label: 'ALERTA', badge: 'bg-destructive/15 text-destructive border-destructive/25' },
};

export function StreamCameraCard({ camera, onClick, compact, showStream = true, aiAnalysisActive = false, onToggleAiAnalysis }: StreamCameraCardProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const status = statusConfig[camera.status] ?? statusConfig.offline!;
  const isOnline = camera.status !== 'offline';

  return (
    <div
      className={cn(
        'group relative rounded-xl overflow-hidden border border-border/40 bg-card cursor-pointer',
        'transition-all duration-300 ease-out',
        'hover:border-primary/40 hover:-translate-y-1.5 hover:shadow-[var(--shadow-card-glow)]',
        'active:scale-[0.98] active:translate-y-0 active:shadow-[var(--shadow-card)]',
        compact ? 'h-24' : 'aspect-video'
      )}
      onClick={onClick}
      style={{ boxShadow: 'var(--shadow-card)' }}
      role="button"
      aria-label={`Visualizar câmera ${camera.name}`}
    >
      {/* Video/Thumbnail */}
      {showStream && camera.streamUrl && !hasError ? (
        <VideoStreamPlayer
          cameraId={camera.id}
          cameraName={camera.name}
          streamUrl={camera.streamUrl}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="absolute inset-0">
          {camera.thumbnail ? (
            <img src={camera.thumbnail} alt={camera.name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <CameraPlaceholder isOnline={isOnline} compact={compact} />
          )}
        </div>
      )}

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/5 to-transparent" />

      {/* Hover scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" style={{ animation: 'scan 3s linear infinite' }} />
      </div>

      {/* Status Badge */}
      <div className="absolute top-2.5 left-2.5">
        <Badge variant="outline" className={cn('text-[10px] font-medium gap-1 px-2 py-0.5 backdrop-blur-sm', status.badge)}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status.dot)} />
          {status.label}
        </Badge>
      </div>

      {/* Alert count */}
      {camera.alerts > 0 && (
        <Badge variant="outline" className="absolute top-2.5 right-2.5 text-[10px] bg-destructive/15 text-destructive border-destructive/25 gap-1 backdrop-blur-sm">
          <AlertTriangle className="w-3 h-3" />
          {camera.alerts} alertas
        </Badge>
      )}

      {/* AI Analysis Badge */}
      {aiAnalysisActive && (
        <Badge className="absolute top-2.5 right-2.5 text-[10px] h-5 bg-primary/80 hover:bg-primary/90 gap-1">
          <Brain className="w-3 h-3 animate-pulse" />
          IA
        </Badge>
      )}

      {/* Controls on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onToggleAiAnalysis && (
          <Button
            variant="secondary"
            size="icon"
            className={cn('h-7 w-7 rounded-lg backdrop-blur-sm', aiAnalysisActive && 'bg-primary text-primary-foreground hover:bg-primary/90')}
            aria-label={aiAnalysisActive ? 'Desativar análise IA' : 'Ativar análise IA'}
            onClick={(e) => { e.stopPropagation(); onToggleAiAnalysis(camera.id, !aiAnalysisActive); }}
          >
            <Brain className="w-3.5 h-3.5" />
          </Button>
        )}
        {showStream && camera.streamUrl && (
          <>
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg backdrop-blur-sm"
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}>
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg backdrop-blur-sm"
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}>
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </Button>
          </>
        )}
        <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Camera Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <h3 className="text-foreground font-semibold text-sm truncate">{camera.name}</h3>
            {camera.location && (
              <p className="text-muted-foreground/80 text-xs truncate">{camera.location}</p>
            )}
          </div>
          {camera.detectedPeople > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{camera.detectedPeople}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
