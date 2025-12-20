/**
 * Componente de Reconhecimento Facial em Tempo Real
 * Integra webcam/câmera com detecção e overlay de reconhecimento
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useRealtimeRecognition, RecognizedFace } from '@/hooks/useRealtimeRecognition';
import { FaceRecognitionOverlay, DetectedFace as OverlayFace, ListType } from '@/components/FaceRecognitionOverlay';

interface LiveFaceRecognitionProps {
  cameraId?: string;
  cameraName?: string;
  className?: string;
  autoStart?: boolean;
  showControls?: boolean;
  showStats?: boolean;
  onFaceRecognized?: (face: RecognizedFace) => void;
  onUnknownFace?: (face: RecognizedFace) => void;
}

export function LiveFaceRecognition({
  cameraId = 'webcam',
  cameraName = 'Webcam',
  className,
  autoStart = false,
  showControls = true,
  showStats = true,
  onFaceRecognized,
  onUnknownFace,
}: LiveFaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasCamera, setHasCamera] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Configurações
  const [config, setConfig] = useState({
    captureInterval: 2000,
    matchThreshold: 0.6,
    alertOnUnknown: false,
    alertOnBlacklist: true,
  });

  const {
    isProcessing,
    isRunning,
    recognizedFaces,
    stats,
    error,
    start,
    stop,
    clearFaces,
    resetStats,
  } = useRealtimeRecognition({
    cameraId,
    cameraName,
    config,
    onFaceRecognized,
    onUnknownFace,
    onBlacklistDetected: (face) => {
      if (soundEnabled) {
        // Tocar som de alerta
        const audio = new Audio('/alert-sound.mp3');
        audio.play().catch(() => {});
      }
    },
  });

  // Converter faces para o formato do overlay
  const overlayFaces: OverlayFace[] = recognizedFaces.map((face) => ({
    id: face.id,
    boundingBox: face.boundingBox,
    personId: face.bestMatch?.personId,
    personName: face.bestMatch?.personName,
    listType: (face.bestMatch?.listType as ListType) || 'unknown',
    similarity: face.bestMatch?.similarity,
    isKnown: face.isKnown,
    timestamp: face.timestamp,
    emotions: face.attributes?.emotion ? {
      dominant: face.attributes.emotion,
      confidence: 0.8,
    } : undefined,
    age: face.attributes?.age ? {
      min: Math.max(0, face.attributes.age - 5),
      max: face.attributes.age + 5,
    } : undefined,
    gender: face.attributes?.gender ? {
      value: face.attributes.gender,
      confidence: 0.8,
    } : undefined,
  }));

  // Inicializar câmera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasCamera(true);
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setHasCamera(false);
    }
  }, []);

  // Parar câmera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    stop();
  }, [stop]);

  // Iniciar/parar reconhecimento
  const toggleRecognition = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    if (isRunning) {
      stop();
    } else {
      start(videoRef.current, canvasRef.current);
    }
  }, [isRunning, start, stop]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Auto-start
  useEffect(() => {
    if (autoStart) {
      startCamera().then(() => {
        if (videoRef.current && canvasRef.current) {
          // Aguardar vídeo carregar
          setTimeout(() => {
            if (videoRef.current && canvasRef.current) {
              start(videoRef.current, canvasRef.current);
            }
          }, 1000);
        }
      });
    }

    return () => {
      stopCamera();
    };
  }, [autoStart]);

  return (
    <div
      className={cn(
        'relative bg-black rounded-lg overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      {/* Vídeo da câmera */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Canvas para captura (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay de reconhecimento facial */}
      <FaceRecognitionOverlay
        faces={overlayFaces}
        showLabels
        showSimilarity
        animateBoxes
      />

      {/* Indicador de processamento */}
      {isProcessing && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Analisando...
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Estatísticas */}
      {showStats && isRunning && (
        <div className="absolute top-4 right-4 flex flex-col gap-1">
          <Badge variant="secondary" className="justify-between gap-2">
            <Users className="w-3 h-3" />
            {stats.totalDetections} detectados
          </Badge>
          <Badge variant="default" className="justify-between gap-2 bg-green-600">
            <UserCheck className="w-3 h-3" />
            {stats.knownFaces} conhecidos
          </Badge>
          <Badge variant="outline" className="justify-between gap-2">
            <UserX className="w-3 h-3" />
            {stats.unknownFaces} desconhecidos
          </Badge>
          {stats.lastProcessingTime > 0 && (
            <Badge variant="outline" className="justify-between gap-2 text-[10px]">
              {stats.lastProcessingTime}ms
            </Badge>
          )}
        </div>
      )}

      {/* Controles */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {/* Ligar/Desligar câmera */}
          <Button
            variant={isCameraOn ? 'default' : 'secondary'}
            size="icon"
            onClick={isCameraOn ? stopCamera : startCamera}
          >
            {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>

          {/* Iniciar/Parar reconhecimento */}
          <Button
            variant={isRunning ? 'destructive' : 'default'}
            size="lg"
            onClick={toggleRecognition}
            disabled={!isCameraOn}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Parar
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Iniciar
              </>
            )}
          </Button>

          {/* Som */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(prev => !prev)}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>

          {/* Configurações */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">Configurações</h4>

                <div className="space-y-2">
                  <Label>Intervalo de captura: {config.captureInterval / 1000}s</Label>
                  <Slider
                    value={[config.captureInterval]}
                    min={500}
                    max={5000}
                    step={500}
                    onValueChange={([v]) => setConfig(c => ({ ...c, captureInterval: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Threshold de similaridade: {Math.round(config.matchThreshold * 100)}%</Label>
                  <Slider
                    value={[config.matchThreshold * 100]}
                    min={30}
                    max={95}
                    step={5}
                    onValueChange={([v]) => setConfig(c => ({ ...c, matchThreshold: v / 100 }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Alertar desconhecidos</Label>
                  <Switch
                    checked={config.alertOnUnknown}
                    onCheckedChange={(v) => setConfig(c => ({ ...c, alertOnUnknown: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Alertar bloqueados</Label>
                  <Switch
                    checked={config.alertOnBlacklist}
                    onCheckedChange={(v) => setConfig(c => ({ ...c, alertOnBlacklist: v }))}
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={clearFaces}>
                    Limpar faces
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetStats}>
                    Resetar stats
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Placeholder quando câmera está desligada */}
      {!isCameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 text-muted-foreground">
          <CameraOff className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">Câmera desligada</p>
          <Button variant="outline" className="mt-4" onClick={startCamera}>
            <Camera className="w-4 h-4 mr-2" />
            Ligar câmera
          </Button>
        </div>
      )}
    </div>
  );
}

export default LiveFaceRecognition;
