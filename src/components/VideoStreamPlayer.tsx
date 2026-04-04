/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: VideoStreamPlayer
 *
 * Player de vídeo profissional com suporte a HLS, detecção de IA,
 * reconhecimento facial, análise contínua e gravação de clips.
 */

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Camera as CameraIcon, RefreshCw, AlertTriangle, Loader2,
  Download, Activity, Scan, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVideoStream } from '@/hooks/useVideoStream';
import { useMLModels } from '@/hooks/useMLModels';
import { testStreamUrls } from '@/types/streaming';
import { FaceRecognitionOverlay } from './FaceRecognitionOverlay';
import { useStreamFaceDetection } from '@/hooks/useStreamFaceDetection';
import { ClipRecorderControls } from './ClipRecorderControls';
import { AnalysisResultsOverlay } from './AnalysisResultsOverlay';
import { useContinuousAnalysis } from '@/hooks/useContinuousAnalysis';
import {
  VideoStatusBadge,
  VideoQualitySelector,
  VideoStatsOverlay,
  VideoDetectionOverlay,
} from './video-player';
import type { VideoStreamPlayerProps } from './video-player';

export function VideoStreamPlayer({
  cameraId, cameraName, location, streamUrl, protocol = 'hls',
  isLive = true, detections = [], showStats = false,
  enableFaceDetection = false, faceDetectionInterval = 3000,
  height, onSnapshot, onError, onClick, className,
  enableContinuousAnalysis = false, analysisType = 'security',
  analysisIntervalMs = 15000, analysisRules = [],
  saveAnalysisHistory = false, onAnalysisAlert, onAnalysisResult,
}: VideoStreamPlayerProps) {
  const [showStatsOverlay, setShowStatsOverlay] = useState(showStats);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [faceDetectionActive, setFaceDetectionActive] = useState(enableFaceDetection);
  const [continuousAnalysisActive, setContinuousAnalysisActive] = useState(enableContinuousAnalysis);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const url = streamUrl || testStreamUrls.hls.bigBuckBunny;

  const {
    videoRef, state, togglePlay, toggleMute, setVolume,
    setQuality, takeSnapshot, toggleFullscreen, reconnect,
  } = useVideoStream({
    url, protocol, autoPlay: true, enableAudio: false,
    onError: (error) => onError?.(error.message),
    onSnapshot: (data) => onSnapshot?.(data),
  });

  // Frame capture for continuous analysis
  const getFrameForAnalysis = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = Math.min(video.videoWidth, 640);
    canvas.height = Math.min(video.videoHeight, 480);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, [videoRef]);

  // Continuous analysis hook
  const {
    session: analysisSession, lastAnalysis,
    isAnalyzing: isAnalysisRunning,
    startAnalysis, stopAnalysis,
  } = useContinuousAnalysis({
    cameraId, cameraName, getFrame: getFrameForAnalysis,
    rules: analysisRules, autoStart: false, createAlerts: true,
    saveToDatabase: saveAnalysisHistory,
    config: { analysisTypes: [analysisType], interval: analysisIntervalMs },
    onAnalysisComplete: (_camId, result) => onAnalysisResult?.(result),
    onAlertGenerated: (_camId, alert, result) => onAnalysisAlert?.(alert, result),
  });

  useEffect(() => {
    if (continuousAnalysisActive && state.status === 'playing') {
      startAnalysis({ analysisTypes: [analysisType], interval: analysisIntervalMs });
    } else {
      stopAnalysis();
    }
    return () => { stopAnalysis(); };
  }, [continuousAnalysisActive, state.status]);

  // Face detection hook
  const {
    faces: detectedFaces, isProcessing: isFaceProcessing,
    start: startFaceDetection, stop: stopFaceDetection,
  } = useStreamFaceDetection({
    cameraId, detectionIntervalMs: faceDetectionInterval,
    autoStart: faceDetectionActive && state.status === 'playing',
    enableAlertSound: true,
  });

  useEffect(() => {
    if (faceDetectionActive && state.status === 'playing') startFaceDetection();
    else stopFaceDetection();
  }, [faceDetectionActive, state.status, startFaceDetection, stopFaceDetection]);

  // Clock
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // ML models (unused but kept for future)
  const { loadModel, isLoading: isMLLoading, isModelLoaded } = useMLModels();
  const [enableMLOverlay, setEnableMLOverlay] = useState(false);
  useEffect(() => {
    if (enableMLOverlay && !isModelLoaded && !isMLLoading) { /* loadModel() */ }
  }, [enableMLOverlay, isModelLoaded, isMLLoading, loadModel]);

  // Auto-hide controls
  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (state.isPlaying) setControlsVisible(false);
    }, 3000);
  };

  useEffect(() => {
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, []);

  const handleSnapshot = () => {
    const data = takeSnapshot();
    if (data) {
      const link = document.createElement('a');
      link.href = data;
      link.download = `snapshot_${cameraId}_${Date.now()}.jpg`;
      link.click();
    }
  };

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn('relative bg-black rounded-xl overflow-hidden group', height ? '' : 'aspect-video', className)}
        style={height ? { height } : undefined}
        onMouseMove={showControls}
        onMouseLeave={() => state.isPlaying && setControlsVisible(false)}
        onClick={onClick}
      >
        {/* Video element */}
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted={state.isMuted} />

        {/* Disconnected placeholder */}
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

        {/* Error */}
        {state.status === 'error' && state.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-4">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-white font-medium mb-2">Erro de conexão</p>
              <p className="text-sm text-muted-foreground mb-4">{state.error.message}</p>
              {state.error.recoverable && (
                <Button variant="outline" size="sm" onClick={reconnect}>
                  <RefreshCw className="w-4 h-4 mr-2" />Reconectar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Overlays */}
        {detections.length > 0 && <VideoDetectionOverlay detections={detections} />}
        {faceDetectionActive && detectedFaces.length > 0 && (
          <FaceRecognitionOverlay faces={detectedFaces} showLabels showSimilarity animateBoxes />
        )}
        {faceDetectionActive && isFaceProcessing && (
          <div className="absolute top-12 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white">
            <Scan className="w-3 h-3 animate-pulse text-primary" /><span>Detectando...</span>
          </div>
        )}
        {continuousAnalysisActive && analysisSession && (
          <AnalysisResultsOverlay lastAnalysis={lastAnalysis} session={analysisSession} isAnalyzing={isAnalysisRunning} />
        )}
        {showStatsOverlay && state.status === 'playing' && (
          <VideoStatsOverlay
            bitrate={state.stats.bitrate} fps={state.stats.fps}
            latency={state.stats.latency} resolution={state.stats.resolution}
            droppedFrames={state.stats.droppedFrames}
          />
        )}

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20"><div className="scan-line" /></div>

        {/* Header */}
        <div className={cn('absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300', controlsVisible ? 'opacity-100' : 'opacity-0')}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{cameraName}</h3>
              {location && <p className="text-xs text-white/70">{location}</p>}
            </div>
            <div className="flex items-center gap-2">
              <VideoStatusBadge status={state.status} />
              {isLive && state.status === 'playing' && (
                <span className="font-mono text-xs text-white bg-black/50 px-2 py-1 rounded">{currentTime}</span>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={cn('absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300', controlsVisible ? 'opacity-100' : 'opacity-0')}>
          <div className="flex items-center gap-2">
            <ControlButton tooltip={state.isPlaying ? 'Pausar' : 'Reproduzir'} onClick={togglePlay}>
              {state.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </ControlButton>
            <ControlButton tooltip={state.isMuted ? 'Ativar som' : 'Silenciar'} onClick={toggleMute}>
              {state.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </ControlButton>
            {!state.isMuted && (
              <div className="w-20" onClick={(e) => e.stopPropagation()}>
                <Slider value={[state.volume * 100]} onValueChange={([v]) => setVolume(v! / 100)} max={100} step={1} className="cursor-pointer" />
              </div>
            )}

            <div className="flex-1" />

            <ControlButton tooltip={faceDetectionActive ? 'Desativar detecção facial' : 'Ativar detecção facial'} onClick={() => setFaceDetectionActive(p => !p)} active={faceDetectionActive}>
              <Scan className={cn('w-4 h-4', isFaceProcessing && 'animate-pulse')} />
            </ControlButton>
            <ControlButton tooltip={continuousAnalysisActive ? 'Desativar análise contínua IA' : 'Ativar análise contínua IA'} onClick={() => setContinuousAnalysisActive(p => !p)} active={continuousAnalysisActive}>
              <Brain className={cn('w-4 h-4', isAnalysisRunning && 'animate-pulse')} />
            </ControlButton>
            <ControlButton tooltip="Estatísticas" onClick={() => setShowStatsOverlay(p => !p)} active={showStatsOverlay}>
              <Activity className="w-4 h-4" />
            </ControlButton>
            <div onClick={(e) => e.stopPropagation()}>
              <ClipRecorderControls cameraId={cameraId} cameraName={cameraName} streamRef={videoRef} compact maxDuration={300} />
            </div>
            <ControlButton tooltip="Capturar imagem" onClick={handleSnapshot}>
              <Download className="w-4 h-4" />
            </ControlButton>
            <div onClick={(e) => e.stopPropagation()}>
              <VideoQualitySelector current={state.currentQuality} available={state.availableQualities} onChange={setQuality} />
            </div>
            <ControlButton tooltip={state.isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'} onClick={toggleFullscreen}>
              {state.isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </ControlButton>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/** Reusable control button with tooltip */
function ControlButton({ tooltip, onClick, active, children }: {
  tooltip: string; onClick: () => void; active?: boolean; children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost" size="sm"
          className={cn('h-9 w-9 p-0 text-white hover:bg-white/20', active && 'bg-primary/40')}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export default memo(VideoStreamPlayer);
