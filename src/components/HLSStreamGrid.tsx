/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: HLSStreamGrid
 * 
 * Grid de câmeras com streaming HLS integrado:
 * - Layouts dinâmicos (1x1, 2x2, 3x3, 4x4)
 * - Auto-play quando visível
 * - Controles de volume e fullscreen
 * - Indicadores de status em tempo real
 * - Suporte a WebRTC para baixa latência
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Camera,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Circle,
  Settings,
  MoreHorizontal,
  ScanFace,
  Target,
  Video,
  X,
} from 'lucide-react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4';
export type StreamProtocol = 'hls' | 'webrtc' | 'auto';

export interface CameraStream {
  id: string;
  name: string;
  location?: string;
  hlsUrl?: string;
  webrtcUrl?: string;
  thumbnailUrl?: string;
  status: 'online' | 'offline' | 'alert' | 'warning' | 'connecting';
  detectedPeople?: number;
  alertsCount?: number;
}

interface HLSStreamGridProps {
  cameras: CameraStream[];
  layout?: GridLayout;
  protocol?: StreamProtocol;
  autoPlay?: boolean;
  muted?: boolean;
  showControls?: boolean;
  showOverlays?: boolean;
  onCameraClick?: (camera: CameraStream) => void;
  onCameraSettings?: (camera: CameraStream) => void;
  onFullscreen?: (camera: CameraStream) => void;
  className?: string;
}

// ============================================
// COMPONENTE: StreamCell (Célula individual)
// ============================================

interface StreamCellProps {
  camera: CameraStream;
  protocol: StreamProtocol;
  autoPlay: boolean;
  muted: boolean;
  showControls: boolean;
  compact: boolean;
  onClick?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
}

const StreamCell = memo(function StreamCell({
  camera,
  protocol,
  autoPlay,
  muted: initialMuted,
  showControls,
  compact,
  onClick,
  onSettings,
  onFullscreen,
}: StreamCellProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [streamStats, setStreamStats] = useState({ bitrate: 0, buffered: 0 });

  const streamUrl = protocol === 'webrtc' && camera.webrtcUrl 
    ? camera.webrtcUrl 
    : camera.hlsUrl;

  const isOnline = camera.status !== 'offline';

  // Intersection Observer para auto-play quando visível
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Inicializar HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || !isOnline || !isVisible) return;

    setIsLoading(true);
    setHasError(false);

    // Limpar instância anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // WebRTC (não usa HLS.js)
    if (protocol === 'webrtc' && camera.webrtcUrl) {
      // TODO: Implementar WebRTC connection
      video.src = camera.webrtcUrl;
      return;
    }

    // HLS
    if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay && isVisible) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setHasError(true);
          setIsLoading(false);
          console.error(`[HLS] Error on ${camera.name}:`, data);
          
          // Retry após erro fatal
          setTimeout(() => {
            if (hlsRef.current) {
              hlsRef.current.loadSource(streamUrl);
            }
          }, 5000);
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
        setStreamStats({
          bitrate: Math.round((data.frag.stats?.total || 0) * 8 / 1000),
          buffered: video.buffered.length > 0 
            ? video.buffered.end(0) - video.currentTime 
            : 0,
        });
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari nativo
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (autoPlay && isVisible) {
          video.play().catch(() => {});
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, isOnline, isVisible, protocol, camera.webrtcUrl, camera.name, autoPlay]);

  // Controle de play/pause baseado em visibilidade
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible && autoPlay && !hasError) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isVisible, autoPlay, hasError]);

  // Handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const vol = value[0];
    video.volume = vol / 100;
    setVolume(vol);
    if (vol === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const retry = () => {
    setHasError(false);
    if (hlsRef.current && streamUrl) {
      hlsRef.current.loadSource(streamUrl);
    }
  };

  // Status badge color
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    alert: 'bg-red-500 animate-pulse',
    warning: 'bg-yellow-500',
    connecting: 'bg-blue-500 animate-pulse',
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative rounded-lg overflow-hidden bg-black group cursor-pointer',
        'transition-all duration-200 hover:ring-2 hover:ring-primary/50'
      )}
      onClick={onClick}
    >
      {/* Video */}
      {isOnline && streamUrl && !hasError ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted={isMuted}
          autoPlay={autoPlay}
        />
      ) : camera.thumbnailUrl ? (
        <img 
          src={camera.thumbnailUrl}
          alt={camera.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Camera className="w-12 h-12 text-muted-foreground/50" />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && isOnline && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <RefreshCw className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-white text-sm mb-2">Erro no stream</p>
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); retry(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Reconectar
          </Button>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', statusColors[camera.status])} />
            {!compact && (
              <span className="text-white text-sm font-medium truncate max-w-[150px]">
                {camera.name}
              </span>
            )}
          </div>
          
          {/* Live badge */}
          {isOnline && isPlaying && !hasError && (
            <Badge className="bg-red-500 text-white text-[10px] h-5">
              <Circle className="w-1.5 h-1.5 mr-1 fill-current animate-pulse" />
              LIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom bar with controls */}
      {showControls && (
        <div className={cn(
          'absolute bottom-0 left-0 right-0 p-2',
          'bg-gradient-to-t from-black/80 to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:bg-white/20"
                      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isPlaying ? 'Pausar' : 'Reproduzir'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Volume */}
              <div 
                className="relative flex items-center"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                
                {showVolumeSlider && (
                  <div className="absolute left-8 bottom-0 bg-black/80 rounded px-2 py-1 w-24">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Stats */}
              {!compact && streamStats.bitrate > 0 && (
                <span className="text-white/70 text-[10px] mr-2">
                  {streamStats.bitrate} kbps
                </span>
              )}

              {/* Detection badges */}
              {!compact && camera.detectedPeople && camera.detectedPeople > 0 && (
                <Badge variant="secondary" className="h-5 text-[10px]">
                  <ScanFace className="w-3 h-3 mr-1" />
                  {camera.detectedPeople}
                </Badge>
              )}

              {/* Fullscreen */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:bg-white/20"
                      onClick={(e) => { e.stopPropagation(); onFullscreen?.(); }}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tela cheia</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSettings?.()}>
                    <Settings className="w-4 h-4 mr-2" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Video className="w-4 h-4 mr-2" /> Gravar clip
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Target className="w-4 h-4 mr-2" /> Configurar zonas
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ScanFace className="w-4 h-4 mr-2" /> Detecção facial
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Camera info */}
          {!compact && camera.location && (
            <p className="text-white/60 text-[10px] mt-1 truncate">
              {camera.location}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function HLSStreamGrid({
  cameras,
  layout = '2x2',
  protocol = 'hls',
  autoPlay = true,
  muted = true,
  showControls = true,
  showOverlays = true,
  onCameraClick,
  onCameraSettings,
  onFullscreen,
  className,
}: HLSStreamGridProps) {
  // Grid classes baseadas no layout
  const gridClasses = {
    '1x1': 'grid-cols-1',
    '2x2': 'grid-cols-1 sm:grid-cols-2',
    '3x3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4x4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  const isCompact = layout === '4x4';

  // Limitar número de câmeras visíveis por layout
  const maxCameras = {
    '1x1': 1,
    '2x2': 4,
    '3x3': 9,
    '4x4': 16,
  };

  const visibleCameras = cameras.slice(0, maxCameras[layout]);

  return (
    <div className={cn(
      'grid gap-4',
      gridClasses[layout],
      className
    )}>
      {visibleCameras.map(camera => (
        <div 
          key={camera.id}
          className={cn(
            layout === '1x1' ? 'aspect-video' : 'aspect-video'
          )}
        >
          <StreamCell
            camera={camera}
            protocol={protocol}
            autoPlay={autoPlay}
            muted={muted}
            showControls={showControls}
            compact={isCompact}
            onClick={() => onCameraClick?.(camera)}
            onSettings={() => onCameraSettings?.(camera)}
            onFullscreen={() => onFullscreen?.(camera)}
          />
        </div>
      ))}

      {/* Placeholder cells */}
      {visibleCameras.length < maxCameras[layout] && 
        Array.from({ length: maxCameras[layout] - visibleCameras.length }).map((_, i) => (
          <div 
            key={`placeholder-${i}`}
            className="aspect-video rounded-lg bg-muted/30 flex items-center justify-center"
          >
            <Camera className="w-8 h-8 text-muted-foreground/30" />
          </div>
        ))
      }
    </div>
  );
}

export default HLSStreamGrid;
