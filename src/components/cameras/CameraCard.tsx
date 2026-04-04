/**
 * CameraCard - Card individual de câmera com streaming, overlays e controles
 */

import { useState } from 'react';
import {
  Camera, Maximize2, Pause, Play, Volume2, VolumeX,
  Wifi, WifiOff, Circle, MoreHorizontal, Settings,
  Trash2, MapPin, AlertTriangle, ScanFace, Clock,
} from 'lucide-react';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
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
  /** Enable continuous AI analysis */
  enableContinuousAnalysis?: boolean;
  /** Rules for analysis engine */
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
            {showOverlays && (
              <>
                <ZoneOverlay zones={[]} showLabels={!isCompact} showStats={!isCompact} />
                <FaceRecognitionOverlay faces={[]} showLabels={!isCompact} showSimilarity={!isCompact} />
              </>
            )}
          </>
        ) : camera.thumbnail ? (
          <img src={camera.thumbnail} alt={camera.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Camera className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <Badge
            variant={isOnline ? 'default' : 'secondary'}
            className={cn('text-xs', camera.status === 'alert' && 'bg-red-500 animate-pulse')}
          >
            {isOnline ? (
              camera.status === 'alert' ? (
                <><Circle className="w-2 h-2 mr-1 fill-current" /> ALERTA</>
              ) : (
                <><Wifi className="w-3 h-3 mr-1" />Online</>
              )
            ) : (
              <><WifiOff className="w-3 h-3 mr-1" />Offline</>
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
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <ClipRecorderControls cameraId={camera.id} cameraName={camera.name} compact />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); onExpand(); }}>
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
                  <MapPin className="w-3 h-3" />{camera.location}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button aria-label="Ação" variant="ghost" size="icon" className="h-8 w-8 -mr-2">
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
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {stats.alertsToday > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
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
