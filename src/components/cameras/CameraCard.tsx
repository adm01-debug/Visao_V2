/**
 * CameraCard - Premium camera card with streaming, overlays and controls
 */

import { useState } from 'react';
import {
  Camera, Maximize2, Pause, Play, Volume2, VolumeX,
  Wifi, WifiOff, Circle, MoreHorizontal, Settings,
  Trash2, MapPin, AlertTriangle, ScanFace, Clock,
} from 'lucide-react';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { CameraPlaceholder } from './CameraPlaceholder';
import { ClipRecorderControls } from '@/components/ClipRecorderControls';
import { FaceRecognitionOverlay } from '@/components/FaceRecognitionOverlay';
import { ZoneOverlay } from '@/components/ZoneOverlay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CameraData, CameraStats, ViewMode } from './types';
import type { DbRule } from '@/types/rules';

interface CameraCardProps {
  camera: CameraData;
  stats?: CameraStats;
  isSelected: boolean;
  viewMode: ViewMode;
  onSelect: () => void;
  onExpand: () => void;
  onSettings: () => void;
  enableContinuousAnalysis?: boolean;
  analysisRules?: DbRule[];
}

export function CameraCard({
  camera, stats, isSelected, viewMode, onSelect, onExpand, onSettings,
  enableContinuousAnalysis, analysisRules,
}: CameraCardProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);

  const isOnline = camera.status !== 'offline';
  const isCompact = viewMode === 'grid-4x4' || viewMode === 'list';

  const statusBadgeClass = cn(
    'text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm',
    camera.status === 'alert'
      ? 'bg-destructive/15 text-destructive border-destructive/25 animate-pulse'
      : isOnline
        ? 'bg-success/15 text-success border-success/20'
        : 'bg-muted/80 text-muted-foreground border-border'
  );

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200 cursor-pointer group border-border/50',
        'hover:shadow-md hover:-translate-y-0.5',
        isSelected && 'ring-2 ring-primary/50',
        !isOnline && 'opacity-60'
      )}
      onClick={onSelect}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Video/Thumbnail */}
      <div className={cn(
        'relative bg-surface-sunken',
        viewMode === 'list' ? 'aspect-video max-w-[200px]' : 'aspect-video'
      )}>
        {isOnline && camera.stream_url ? (
          <>
            <VideoStreamPlayer
              cameraId={camera.id}
              streamUrl={camera.stream_url}
              protocol="hls"
              cameraName={camera.name}
              enableContinuousAnalysis={enableContinuousAnalysis}
              analysisRules={analysisRules}
              saveAnalysisHistory
            />
            {showOverlays && (
              <>
                <ZoneOverlay zones={[]} showLabels={!isCompact} showStats={!isCompact} />
                <FaceRecognitionOverlay faces={[]} showLabels={!isCompact} showSimilarity={!isCompact} />
              </>
            )}
          </>
        ) : camera.thumbnail ? (
          <img src={camera.thumbnail} alt={camera.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <CameraPlaceholder isOnline={isOnline} compact={isCompact} />
        )}

        {/* Status Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={statusBadgeClass}>
                {isOnline ? (
                  camera.status === 'alert' ? (
                    <><Circle className="w-2 h-2 mr-1 fill-current" /> ALERTA</>
                  ) : (
                    <><span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 inline-block animate-pulse" />Online</>
                  )
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" />Offline</>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-center">
              <p className="text-xs">
                {camera.status === 'alert'
                  ? 'Câmera detectou uma situação de alerta que requer atenção imediata'
                  : isOnline
                    ? 'Câmera operando normalmente e transmitindo em tempo real'
                    : 'Câmera desconectada ou sem comunicação com o servidor'}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Controls Overlay */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
        )}>
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/90 hover:text-foreground hover:bg-background/15 rounded-lg"
                onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/90 hover:text-foreground hover:bg-background/15 rounded-lg"
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <ClipRecorderControls cameraId={camera.id} cameraName={camera.name} compact />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/90 hover:text-foreground hover:bg-background/15 rounded-lg"
                onClick={(e) => { e.stopPropagation(); onExpand(); }}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      {viewMode !== 'grid-4x4' && (
        <CardContent className="p-3.5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate text-foreground">{camera.name}</h3>
              {camera.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{camera.location}</span>
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button aria-label="Ação" variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExpand}>
                  <Maximize2 className="w-4 h-4 mr-2" />Expandir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="w-4 h-4 mr-2" />Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {!isCompact && stats && (
            <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
              {stats.alertsToday > 0 && (
                <span className="flex items-center gap-1 text-severity-medium">
                  <AlertTriangle className="w-3 h-3" />{stats.alertsToday}
                </span>
              )}
              {stats.peopleDetected > 0 && (
                <span className="flex items-center gap-1">
                  <ScanFace className="w-3 h-3" />{stats.peopleDetected}
                </span>
              )}
              {camera.last_activity && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(camera.last_activity), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
