import { useInterval, useTimeout } from "@/hooks";
import { memo } from "react";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: CameraWithContinuousAnalysis
 * 
 * Integração completa de streaming de vídeo com análise contínua.
 * Combina VideoStreamPlayer com useContinuousAnalysis.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ContinuousAnalysisPanel } from '@/components/ContinuousAnalysisPanel';
import { useContinuousAnalysis } from '@/hooks/useContinuousAnalysis';
import { useAlerts } from '@/hooks/useAlerts';
import { useRules } from '@/hooks/useRules';
import { DbCamera } from '@/hooks/useCameras';
import { useVideoStream } from '@/hooks/useVideoStream';
import { useMLModels } from '@/hooks/useMLModels';
import { usePPEDetection } from '@/hooks/usePPEDetection';
import { 
  AnalysisResult, 
  SecurityAnalysis,
  SafetyAnalysis,
  ProductivityAnalysis,
  Detection,
  AnalysisType,
} from '@/hooks/useImageAnalysis';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Activity,
  AlertTriangle,
  Users,
  Camera as CameraIcon,
  Loader2,
  RefreshCw,
  Download,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

interface StreamDetection {
  id: string;
  type: 'person' | 'vehicle' | 'object' | 'zone';
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface CameraWithContinuousAnalysisProps {
  /** Câmera a ser monitorada */
  camera: DbCamera;
  
  /** Mostrar painel de análise */
  showAnalysisPanel?: boolean;
  
  /** Layout */
  layout?: 'horizontal' | 'vertical' | 'overlay';
  
  /** Auto-iniciar análise */
  autoStartAnalysis?: boolean;
  
  /** Intervalo inicial (ms) */
  initialInterval?: number;
  
  /** Mostrar detecções no vídeo */
  showDetections?: boolean;
  
  /** Callback quando alerta é gerado */
  onAlertGenerated?: (data: { cameraId: string; alert: unknown; analysis: AnalysisResult }) => void;
  
  /** Callback ao clicar na câmera */
  onClick?: () => void;
  
  /** Altura do player */
  height?: number | string;
  
  /** Classe CSS */
  className?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Converte detecções da IA para formato do overlay
 */
function convertDetectionsToOverlay(analysis: AnalysisResult): StreamDetection[] {
  const detections: StreamDetection[] = [];
  
  if ('detections' in analysis) {
    const secAnalysis = analysis as SecurityAnalysis;
    
    secAnalysis.detections?.forEach((det: Detection, index: number) => {
      // Gerar posição baseada no índice
      // Em produção, usar modelo que retorna bounding boxes reais
      const col = index % 4;
      const row = Math.floor(index / 4);
      
      detections.push({
        id: `det-${index}`,
        type: det.type as StreamDetection['type'],
        label: det.label,
        confidence: det.confidence,
        boundingBox: {
          x: 8 + (col * 22),
          y: 12 + (row * 28),
          width: 18,
          height: 25,
        },
        severity: det.severity,
      });
    });
  }
  
  // Adicionar indicadores de pessoas
  const peopleCount = analysis.people_count || 0;
  const existingPeople = detections.filter(d => d.type === 'person').length;
  
  for (let i = existingPeople; i < Math.min(peopleCount, 6); i++) {
    detections.push({
      id: `person-${i}`,
      type: 'person',
      label: `Pessoa ${i + 1}`,
      confidence: 0.85 + Math.random() * 0.1,
      boundingBox: {
        x: 10 + (i % 3) * 28,
        y: 15 + Math.floor(i / 3) * 35,
        width: 14,
        height: 32,
      },
    });
  }
  
  return detections;
}

// ============================================
// DETECTION OVERLAY COMPONENT
// ============================================

function DetectionOverlay({ 
  detections, 
  visible 
}: { 
  detections: StreamDetection[];
  visible: boolean;
}) {
  if (!visible || detections.length === 0) return null;

  const severityColors = {
    low: 'border-blue-400 bg-blue-400/10',
    medium: 'border-yellow-400 bg-yellow-400/10',
    high: 'border-orange-500 bg-orange-500/10',
    critical: 'border-red-500 bg-red-500/20 animate-pulse',
  };

  const typeColors = {
    person: 'border-primary bg-primary/10',
    vehicle: 'border-cyan-400 bg-cyan-400/10',
    object: 'border-purple-400 bg-purple-400/10',
    zone: 'border-dashed border-destructive bg-destructive/10',
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {detections.map(det => (
        <div
          key={det.id}
          className={cn(
            'absolute border-2 rounded transition-all duration-300',
            det.severity ? severityColors[det.severity] : typeColors[det.type]
          )}
          style={{
            left: `${det.boundingBox.x}%`,
            top: `${det.boundingBox.y}%`,
            width: `${det.boundingBox.width}%`,
            height: `${det.boundingBox.height}%`,
          }}
        >
          <div className="absolute -top-5 left-0 bg-background/90 backdrop-blur-sm text-foreground text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-1">
            <span>{det.label}</span>
            <span className="text-muted-foreground">
              {Math.round(det.confidence * 100)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// STATS OVERLAY COMPONENT
// ============================================

function AnalysisStatsOverlay({
  analysis,
  visible,
}: {
  analysis: AnalysisResult | null;
  visible: boolean;
}) {
  if (!visible || !analysis) return null;

  return (
    <div className="absolute bottom-16 left-3 bg-black/70 backdrop-blur-sm rounded-lg p-2 text-xs text-white space-y-1 z-20">
      <div className="flex items-center gap-2">
        <Users className="w-3 h-3 text-primary" />
        <span>{analysis.people_count} pessoa(s)</span>
      </div>
      
      {'working_count' in analysis && (
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-green-400" />
          <span>{(analysis as ProductivityAnalysis).working_count} trabalhando</span>
        </div>
      )}
      
      {'ppe_compliance' in analysis && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-yellow-400" />
          <span>
            EPI: {(analysis as SafetyAnalysis).ppe_compliance.compliant}/
            {(analysis as SafetyAnalysis).ppe_compliance.compliant + 
             (analysis as SafetyAnalysis).ppe_compliance.non_compliant}
          </span>
        </div>
      )}
      
      {'alerts' in analysis && (analysis as SecurityAnalysis).alerts?.length > 0 && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-3 h-3" />
          <span>{(analysis as SecurityAnalysis).alerts.length} alerta(s)</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function CameraWithContinuousAnalysis({
  camera,
  showAnalysisPanel = true,
  layout = 'horizontal',
  autoStartAnalysis = false,
  initialInterval = 5000,
  showDetections: initialShowDetections = true,
  onAlertGenerated,
  onClick,
  height = 400,
  className,
}: CameraWithContinuousAnalysisProps) {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Estado
  const [detections, setDetections] = useState<StreamDetection[]>([]);
  const [showDetections, setShowDetections] = useState(initialShowDetections);
  const [showStats, setShowStats] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [mlDetections, setMlDetections] = useState<any[]>([]);
  
  // Hooks externos
  const { rules } = useRules();

  // Hook de ML Models para detecção local
  const {
    detectObjects,
    detectPersons,
    isReady: mlReady,
    isLoading: mlLoading,
    backend: mlBackend,
  } = useMLModels({
    models: ['coco-ssd'],
    autoLoad: true,
  });


  // Hook de detecção de EPI (PPE)
  const {
    detectPPE,
    isDetecting: isPPEDetecting,
    lastDetection: lastPPEDetection,
    ppeStats,
    violations: ppeViolations,
  } = usePPEDetection({
    enabled: analysisConfig.analysisTypes.includes("safety"),
    minConfidence: analysisConfig.alertThresholds.minConfidence,
    alertOnViolation: true,
  });
  // URL do stream (usando URL de teste pois stream_url não existe no schema atual)
  const streamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

  // Hook de streaming
  const {
    videoRef,
    state: streamState,
    play,
    pause,
    togglePlay,
    toggleMute,
    takeSnapshot,
    toggleFullscreen,
    reconnect,
  } = useVideoStream({
    url: streamUrl,
    protocol: 'hls',
    autoPlay: true,
  });

  // Função para capturar frame
  const getFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  }, [videoRef]);

  // Hook de análise contínua
  const {
    session,
    history,
    lastAnalysis,
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
    pauseAnalysis,
    resumeAnalysis,
    analyzeOnce,
    updateConfig,
    clearHistory,
    exportHistory,
  } = useContinuousAnalysis({
    cameraId: camera.id,
    cameraName: camera.name,
    getFrame,
    rules,
    autoStart: autoStartAnalysis,
    createAlerts: true,
    config: {
      interval: initialInterval,
      analysisTypes: ['security'],
    },
    onAlertGenerated: (cameraId, alert, analysis) => {
      toast.warning(`${camera.name}: ${alert.message}`, {
        description: alert.recommendation,
        duration: 5000,
      });
      onAlertGenerated?.({ cameraId, alert, analysis });
    },
    onAnalysisComplete: (cameraId, result, duration) => {
      const newDetections = convertDetectionsToOverlay(result);
      setDetections(newDetections);
      
      // Limpar detecções após intervalo
      setTimeout(() => {
        setDetections([]);
      }, Math.max(initialInterval - 1000, 3000));
    },
    onRuleViolation: (cameraId, evaluation, analysis) => {
      toast.error(`Regra violada: ${evaluation.ruleName}`, {
        description: evaluation.message,
        duration: 8000,
      });
    },
  });

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (streamState.isPlaying) {
      timeout = setTimeout(() => setControlsVisible(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [streamState.isPlaying, controlsVisible]);

  const handleMouseMove = () => {
    setControlsVisible(true);
  };

  const handleSnapshot = () => {
    const data = takeSnapshot();
    if (data) {
      const link = document.createElement('a');
      link.href = data;
      link.download = `snapshot_${camera.id}_${Date.now()}.jpg`;
      link.click();
      toast.success('Snapshot salvo!');
    }
  };

  // ============================================
  // RENDER: Player de Vídeo
  // ============================================

  const renderVideoPlayer = () => (
    <div
      className="relative bg-black rounded-xl overflow-hidden group"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => streamState.isPlaying && setControlsVisible(false)}
      onClick={onClick}
    >
      {/* Vídeo */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted={streamState.isMuted}
      />

      {/* Placeholder */}
      {streamState.status === 'disconnected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <div className="text-center">
            <CameraIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Câmera desconectada</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {(streamState.status === 'connecting' || streamState.status === 'buffering') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Detecções */}
      <DetectionOverlay detections={detections} visible={showDetections} />

      {/* Stats da análise */}
      <AnalysisStatsOverlay analysis={lastAnalysis} visible={showStats} />

      {/* Indicador de análise em progresso */}
      {isAnalyzing && (
        <div className="absolute top-3 right-3 z-20">
          <Badge className="bg-primary gap-1.5 animate-pulse">
            <Activity className="w-3 h-3" />
            Analisando...
          </Badge>
        </div>
      )}

      {/* Header overlay */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 z-10',
          controlsVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">{camera.name}</h3>
            <p className="text-xs text-white/70">{camera.location}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status do stream */}
            <Badge
              className={cn(
                'gap-1.5 text-white border-0',
                streamState.status === 'playing' ? 'bg-green-500' :
                streamState.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
              )}
            >
              {streamState.status === 'playing' ? (
                <>
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  AO VIVO
                </>
              ) : streamState.status === 'error' ? (
                <>
                  <WifiOff className="w-3 h-3" />
                  Erro
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3" />
                  {streamState.status}
                </>
              )}
            </Badge>

            {/* Status da análise */}
            {session && session.status === 'running' && (
              <Badge className="bg-primary gap-1.5">
                <Activity className="w-3 h-3" />
                IA Ativa
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 z-10',
          controlsVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <TooltipProvider>
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
                  {streamState.isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {streamState.isPlaying ? 'Pausar' : 'Reproduzir'}
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
                  {streamState.isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {streamState.isMuted ? 'Ativar som' : 'Silenciar'}
              </TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            {/* Toggle detecções */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-9 w-9 p-0 text-white hover:bg-white/20',
                    showDetections && 'bg-white/20'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetections(!showDetections);
                  }}
                >
                  {showDetections ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showDetections ? 'Ocultar detecções' : 'Mostrar detecções'}
              </TooltipContent>
            </Tooltip>

            {/* Toggle stats */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-9 w-9 p-0 text-white hover:bg-white/20',
                    showStats && 'bg-white/20'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStats(!showStats);
                  }}
                >
                  <Activity className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Estatísticas</TooltipContent>
            </Tooltip>

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
              <TooltipContent>Snapshot</TooltipContent>
            </Tooltip>

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
                  <Maximize className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tela cheia</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER: Layout
  // ============================================

  if (!showAnalysisPanel) {
    return (
      <div className={className}>
        {renderVideoPlayer()}
      </div>
    );
  }

  if (layout === 'overlay') {
    return (
      <div className={cn('relative', className)}>
        {renderVideoPlayer()}
        <div className="absolute top-3 right-3 w-80 z-30">
          <ContinuousAnalysisPanel
            session={session}
            history={history}
            isAnalyzing={isAnalyzing}
            onStart={startAnalysis}
            onStop={stopAnalysis}
            onPause={pauseAnalysis}
            onResume={resumeAnalysis}
            onConfigUpdate={updateConfig}
            onClearHistory={clearHistory}
            onExportHistory={exportHistory}
            onAnalyzeOnce={analyzeOnce}
            className="bg-background/95 backdrop-blur"
          />
        </div>
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        {renderVideoPlayer()}
        <ContinuousAnalysisPanel
          session={session}
          history={history}
          isAnalyzing={isAnalyzing}
          onStart={startAnalysis}
          onStop={stopAnalysis}
          onPause={pauseAnalysis}
          onResume={resumeAnalysis}
          onConfigUpdate={updateConfig}
          onClearHistory={clearHistory}
          onExportHistory={exportHistory}
          onAnalyzeOnce={analyzeOnce}
        />
      </div>
    );
  }

  // Layout horizontal (default)
  return (
    <div className={cn('flex gap-4', className)}>
      <div className="flex-1">
        {renderVideoPlayer()}
      </div>
      <div className="w-80 flex-shrink-0">
        <ContinuousAnalysisPanel
          session={session}
          history={history}
          isAnalyzing={isAnalyzing}
          onStart={startAnalysis}
          onStop={stopAnalysis}
          onPause={pauseAnalysis}
          onResume={resumeAnalysis}
          onConfigUpdate={updateConfig}
          onClearHistory={clearHistory}
          onExportHistory={exportHistory}
          onAnalyzeOnce={analyzeOnce}
        />
      </div>
    </div>
  );
}

export default memo(CameraWithContinuousAnalysis);
