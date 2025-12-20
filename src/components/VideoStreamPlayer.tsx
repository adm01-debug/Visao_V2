/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: VideoStreamPlayer
 * 
 * Player de vídeo profissional com suporte a:
 * - Streaming HLS em tempo real
 * - Controles de reprodução
 * - Seleção de qualidade
 * - Snapshot
 * - Fullscreen
 * - Exibição de estatísticas
 * - Overlay de detecção de IA
 */

import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Camera as CameraIcon,
  Settings,
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
  Download,
  Activity,
  Zap,
  Signal,
  Scan,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useVideoStream } from '@/hooks/useVideoStream';
import {
  StreamConfig,
  StreamQuality,
  StreamStatus,
  testStreamUrls,
} from '@/types/streaming';
import { FaceRecognitionOverlay } from './FaceRecognitionOverlay';
import { useStreamFaceDetection } from '@/hooks/useStreamFaceDetection';
import { ClipRecorderControls } from './ClipRecorderControls';

// ============================================
// TIPOS
// ============================================

interface Detection {
  id: string;
  type: 'person' | 'vehicle' | 'object' | 'zone';
  label: string;
  confidence: number;
  boundingBox: {
    x: number; // percentual 0-100
    y: number;
    width: number;
    height: number;
  };
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface VideoStreamPlayerProps {
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da câmera */
  cameraName: string;
  
  /** Localização */
  location?: string;
  
  /** URL do stream (ou usa teste) */
  streamUrl?: string;
  
  /** Protocolo de streaming */
  protocol?: StreamConfig['protocol'];
  
  /** É ao vivo? */
  isLive?: boolean;
  
  /** Detecções de IA para overlay */
  detections?: Detection[];
  
  /** Mostrar estatísticas */
  showStats?: boolean;
  
  /** Habilitar detecção facial */
  enableFaceDetection?: boolean;
  
  /** Intervalo de detecção facial em ms */
  faceDetectionInterval?: number;
  
  /** Altura fixa (default: aspect-video) */
  height?: number | string;
  
  /** Callback ao tirar snapshot */
  onSnapshot?: (imageData: string) => void;
  
  /** Callback de erro */
  onError?: (error: string) => void;
  
  /** Callback ao clicar na câmera */
  onClick?: () => void;
  
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: StreamStatus }) {
  const config: Record<StreamStatus, { color: string; label: string; icon: typeof WifiOff; animate?: boolean }> = {
    disconnected: { color: 'bg-gray-500', label: 'Desconectado', icon: WifiOff },
    connecting: { color: 'bg-yellow-500', label: 'Conectando...', icon: Loader2, animate: true },
    connected: { color: 'bg-blue-500', label: 'Conectado', icon: Wifi },
    playing: { color: 'bg-green-500', label: 'Ao Vivo', icon: Activity },
    buffering: { color: 'bg-yellow-500', label: 'Carregando...', icon: Loader2, animate: true },
    paused: { color: 'bg-gray-500', label: 'Pausado', icon: Pause },
    error: { color: 'bg-red-500', label: 'Erro', icon: AlertTriangle },
    reconnecting: { color: 'bg-orange-500', label: 'Reconectando...', icon: RefreshCw, animate: true },
  };

  const statusConfig = config[status];
  const Icon = statusConfig.icon;
  const animate = statusConfig.animate;

  return (
    <Badge className={cn('gap-1.5 text-white border-0', statusConfig.color)}>
      <Icon className={cn('w-3 h-3', animate && 'animate-spin')} />
      {statusConfig.label}
    </Badge>
  );
}

// ============================================
// QUALITY SELECTOR
// ============================================

function QualitySelector({
  current,
  available,
  onChange,
}: {
  current: StreamQuality;
  available: StreamQuality[];
  onChange: (q: StreamQuality) => void;
}) {
  const labels: Record<StreamQuality, string> = {
    auto: 'Auto',
    '1080p': '1080p HD',
    '720p': '720p HD',
    '480p': '480p',
    '360p': '360p',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-white hover:bg-white/20">
          <Settings className="w-4 h-4 mr-1" />
          {labels[current]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Qualidade</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map(q => (
          <DropdownMenuItem
            key={q}
            onClick={() => onChange(q)}
            className={cn(q === current && 'bg-primary/10')}
          >
            {labels[q]}
            {q === current && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================
// STATS OVERLAY
// ============================================

function StatsOverlay({
  bitrate,
  fps,
  latency,
  resolution,
  droppedFrames,
}: {
  bitrate: number;
  fps: number;
  latency: number;
  resolution: { width: number; height: number };
  droppedFrames: number;
}) {
  return (
    <div className="absolute top-12 left-3 bg-black/70 backdrop-blur-sm rounded-lg p-2 text-xs font-mono text-white space-y-1">
      <div className="flex items-center gap-2">
        <Signal className="w-3 h-3 text-green-400" />
        <span>{bitrate} kbps</span>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="w-3 h-3 text-yellow-400" />
        <span>{fps} FPS</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3 text-blue-400" />
        <span>{latency}ms</span>
      </div>
      <div className="text-muted-foreground">
        {resolution.width}x{resolution.height}
      </div>
      {droppedFrames > 0 && (
        <div className="text-red-400">
          Perdidos: {droppedFrames}
        </div>
      )}
    </div>
  );
}

// ============================================
// DETECTION OVERLAY
// ============================================

function DetectionOverlay({ detections }: { detections: Detection[] }) {
  const severityColors = {
    low: 'border-blue-400 bg-blue-400/10',
    medium: 'border-yellow-400 bg-yellow-400/10',
    high: 'border-orange-400 bg-orange-400/10',
    critical: 'border-red-400 bg-red-400/10 animate-pulse',
  };

  const typeColors = {
    person: 'border-primary',
    vehicle: 'border-cyan-400',
    object: 'border-purple-400',
    zone: 'border-dashed border-destructive',
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map(det => (
        <div
          key={det.id}
          className={cn(
            'absolute border-2 rounded-sm transition-all duration-200',
            det.severity ? severityColors[det.severity] : typeColors[det.type]
          )}
          style={{
            left: `${det.boundingBox.x}%`,
            top: `${det.boundingBox.y}%`,
            width: `${det.boundingBox.width}%`,
            height: `${det.boundingBox.height}%`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-background/90 backdrop-blur-sm text-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {det.label}
            {det.confidence < 1 && (
              <span className="ml-1 text-muted-foreground">
                {Math.round(det.confidence * 100)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function VideoStreamPlayer({
  cameraId,
  cameraName,
  location,
  streamUrl,
  protocol = 'hls',
  isLive = true,
  detections = [],
  showStats = false,
  enableFaceDetection = false,
  faceDetectionInterval = 3000,
  height,
  onSnapshot,
  onError,
  onClick,
  className,
}: VideoStreamPlayerProps) {
  // Estados locais
  const [showStatsOverlay, setShowStatsOverlay] = useState(showStats);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [faceDetectionActive, setFaceDetectionActive] = useState(enableFaceDetection);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // URL do stream (usar teste se não fornecido)
  const url = streamUrl || testStreamUrls.hls.bigBuckBunny;

  // Hook de streaming
  const {
    videoRef,
    state,
    play,
    pause,
    togglePlay,
    toggleMute,
    setVolume,
    setQuality,
    takeSnapshot,
    toggleFullscreen,
    reconnect,
  } = useVideoStream({
    url,
    protocol,
    autoPlay: true,
    enableAudio: false,
    onError: (error) => {
      onError?.(error.message);
    },
    onSnapshot: (data) => {
      onSnapshot?.(data);
    },
  });

  // Hook de detecção facial
  const {
    faces: detectedFaces,
    isProcessing: isFaceProcessing,
    isActive: isFaceDetectionActive,
    start: startFaceDetection,
    stop: stopFaceDetection,
    stats: faceStats,
  } = useStreamFaceDetection({
    cameraId,
    detectionIntervalMs: faceDetectionInterval,
    autoStart: faceDetectionActive && state.status === 'playing',
    enableAlertSound: true,
  });

  // Sincronizar estado de detecção facial
  useEffect(() => {
    if (faceDetectionActive && state.status === 'playing') {
      startFaceDetection();
    } else {
      stopFaceDetection();
    }
  }, [faceDetectionActive, state.status, startFaceDetection, stopFaceDetection]);

  // Hora atual
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-hide controles
  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (state.isPlaying) {
        setControlsVisible(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Snapshot handler
  const handleSnapshot = () => {
    const data = takeSnapshot();
    if (data) {
      // Download automático
      const link = document.createElement('a');
      link.href = data;
      link.download = `snapshot_${cameraId}_${Date.now()}.jpg`;
      link.click();
    }
  };

  // Toggle face detection
  const toggleFaceDetection = () => {
    setFaceDetectionActive(prev => !prev);
  };

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          'relative bg-black rounded-xl overflow-hidden group',
          height ? '' : 'aspect-video',
          className
        )}
        style={height ? { height } : undefined}
        onMouseMove={showControls}
        onMouseLeave={() => state.isPlaying && setControlsVisible(false)}
        onClick={onClick}
      >
        {/* Vídeo */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted={state.isMuted}
        />

        {/* Placeholder quando desconectado */}
        {state.status === 'disconnected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <div className="text-center">
              <CameraIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Câmera desconectada</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {(state.status === 'connecting' || state.status === 'buffering') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        )}

        {/* Erro */}
        {state.status === 'error' && state.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-4">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-white font-medium mb-2">Erro de conexão</p>
              <p className="text-sm text-muted-foreground mb-4">{state.error.message}</p>
              {state.error.recoverable && (
                <Button variant="outline" size="sm" onClick={reconnect}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconectar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Overlay de detecções de objetos */}
        {detections.length > 0 && <DetectionOverlay detections={detections} />}

        {/* Face Recognition Overlay */}
        {faceDetectionActive && detectedFaces.length > 0 && (
          <FaceRecognitionOverlay
            faces={detectedFaces}
            showLabels={true}
            showSimilarity={true}
            animateBoxes={true}
          />
        )}

        {/* Face detection processing indicator */}
        {faceDetectionActive && isFaceProcessing && (
          <div className="absolute top-12 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white">
            <Scan className="w-3 h-3 animate-pulse text-primary" />
            <span>Detectando...</span>
          </div>
        )}

        {/* Stats overlay */}
        {showStatsOverlay && state.status === 'playing' && (
          <StatsOverlay
            bitrate={state.stats.bitrate}
            fps={state.stats.fps}
            latency={state.stats.latency}
            resolution={state.stats.resolution}
            droppedFrames={state.stats.droppedFrames}
          />
        )}

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="scan-line" />
        </div>

        {/* Header overlay */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{cameraName}</h3>
              {location && (
                <p className="text-xs text-white/70">{location}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={state.status} />
              {isLive && state.status === 'playing' && (
                <span className="font-mono text-xs text-white bg-black/50 px-2 py-1 rounded">
                  {currentTime}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controls overlay */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                >
                  {state.isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {state.isPlaying ? 'Pausar' : 'Reproduzir'}
              </TooltipContent>
            </Tooltip>

            {/* Volume */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                >
                  {state.isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {state.isMuted ? 'Ativar som' : 'Silenciar'}
              </TooltipContent>
            </Tooltip>

            {/* Volume slider (se não mutado) */}
            {!state.isMuted && (
              <div className="w-20" onClick={(e) => e.stopPropagation()}>
                <Slider
                  value={[state.volume * 100]}
                  onValueChange={([v]) => setVolume(v / 100)}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            )}

            <div className="flex-1" />

            {/* Face detection toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-9 w-9 p-0 text-white hover:bg-white/20',
                    faceDetectionActive && 'bg-primary/40'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFaceDetection();
                  }}
                >
                  <Scan className={cn('w-4 h-4', isFaceProcessing && 'animate-pulse')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {faceDetectionActive ? 'Desativar detecção facial' : 'Ativar detecção facial'}
              </TooltipContent>
            </Tooltip>

            {/* Stats toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-9 w-9 p-0 text-white hover:bg-white/20',
                    showStatsOverlay && 'bg-white/20'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStatsOverlay(!showStatsOverlay);
                  }}
                >
                  <Activity className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Estatísticas</TooltipContent>
            </Tooltip>

            {/* Clip Recorder Controls */}
            <div onClick={(e) => e.stopPropagation()}>
              <ClipRecorderControls
                cameraId={cameraId}
                cameraName={cameraName}
                streamRef={videoRef}
                compact={true}
                maxDuration={300}
              />
            </div>

            {/* Snapshot */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSnapshot();
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Capturar imagem</TooltipContent>
            </Tooltip>

            {/* Quality selector */}
            <div onClick={(e) => e.stopPropagation()}>
              <QualitySelector
                current={state.currentQuality}
                available={state.availableQualities}
                onChange={setQuality}
              />
            </div>

            {/* Fullscreen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                >
                  {state.isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {state.isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default VideoStreamPlayer;
