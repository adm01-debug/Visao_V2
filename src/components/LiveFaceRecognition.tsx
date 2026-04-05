/**
 * LiveFaceRecognition (Refactored)
 * Controls extracted to ./live-face/LiveFaceControls.tsx
 */
import { logger } from "@/lib/logger";
import { useState, useRef, useEffect, useCallback } from 'react';
import { CameraOff, Camera, RefreshCw, Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRealtimeRecognition, RecognizedFace } from '@/hooks/useRealtimeRecognition';
import { FaceRecognitionOverlay, DetectedFace as OverlayFace, ListType } from '@/components/FaceRecognitionOverlay';
import { LiveFaceControls } from './live-face/LiveFaceControls';

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

export function LiveFaceRecognition({ cameraId = 'webcam', cameraName = 'Webcam', className, autoStart = false, showControls = true, showStats = true, onFaceRecognized, onUnknownFace }: LiveFaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [config, setConfig] = useState({ captureInterval: 2000, matchThreshold: 0.6, alertOnUnknown: false, alertOnBlacklist: true });

  const { isProcessing, isRunning, recognizedFaces, stats, error, start, stop, clearFaces, resetStats } = useRealtimeRecognition({
    cameraId, cameraName, config, onFaceRecognized, onUnknownFace,
    onBlacklistDetected: () => { if (soundEnabled) { new Audio('/alert-sound.mp3').play().catch(() => {}); } },
  });

  const overlayFaces: OverlayFace[] = recognizedFaces.map(face => ({
    id: face.id, boundingBox: face.boundingBox, personId: face.bestMatch?.personId, personName: face.bestMatch?.personName,
    listType: (face.bestMatch?.listType as ListType) || 'unknown', similarity: face.bestMatch?.similarity, isKnown: face.isKnown, timestamp: face.timestamp,
    emotions: face.attributes?.emotion ? { dominant: face.attributes.emotion, confidence: 0.8 } : undefined,
    age: face.attributes?.age ? { min: Math.max(0, face.attributes.age - 5), max: face.attributes.age + 5 } : undefined,
    gender: face.attributes?.gender ? { value: face.attributes.gender, confidence: 0.8 } : undefined,
  }));

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 }, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setHasCamera(true); setIsCameraOn(true); }
    } catch (err) { logger.error('Erro ao acessar câmera:', err); setHasCamera(false); }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
    setIsCameraOn(false); stop();
  }, [stop]);

  const toggleRecognition = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    if (isRunning) stop(); else start(videoRef.current, canvasRef.current);
  }, [isRunning, start, stop]);

  useEffect(() => {
    if (autoStart) { startCamera().then(() => { setTimeout(() => { if (videoRef.current && canvasRef.current) start(videoRef.current, canvasRef.current); }, 1000); }); }
    return () => { stopCamera(); };
  }, [autoStart]);

  return (
    <div className={cn('relative bg-black rounded-lg overflow-hidden', isFullscreen && 'fixed inset-0 z-50', className)}>
      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      <FaceRecognitionOverlay faces={overlayFaces} showLabels showSimilarity animateBoxes />

      {isProcessing && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />Analisando...
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-sm">
          <AlertTriangle className="w-4 h-4" />{error}
        </div>
      )}

      {showStats && isRunning && (
        <div className="absolute top-4 right-4 flex flex-col gap-1">
          <Badge variant="secondary" className="justify-between gap-2"><Users className="w-3 h-3" />{stats.totalDetections} detectados</Badge>
          <Badge variant="default" className="justify-between gap-2 bg-green-600"><UserCheck className="w-3 h-3" />{stats.knownFaces} conhecidos</Badge>
          <Badge variant="outline" className="justify-between gap-2"><UserX className="w-3 h-3" />{stats.unknownFaces} desconhecidos</Badge>
          {stats.lastProcessingTime > 0 && <Badge variant="outline" className="justify-between gap-2 text-[10px]">{stats.lastProcessingTime}ms</Badge>}
        </div>
      )}

      {showControls && (
        <LiveFaceControls isCameraOn={isCameraOn} isRunning={isRunning} isFullscreen={isFullscreen} soundEnabled={soundEnabled} config={config}
          onToggleCamera={isCameraOn ? stopCamera : startCamera} onToggleRecognition={toggleRecognition}
          onToggleSound={() => setSoundEnabled(p => !p)} onToggleFullscreen={() => setIsFullscreen(p => !p)}
          onConfigChange={setConfig} onClearFaces={clearFaces} onResetStats={resetStats} />
      )}

      {!isCameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 text-muted-foreground">
          <CameraOff className="w-16 h-16 mb-4 opacity-50" /><p className="text-lg font-medium">Câmera desligada</p>
          <Button variant="outline" className="mt-4" onClick={startCamera}><Camera className="w-4 h-4 mr-2" />Ligar câmera</Button>
        </div>
      )}
    </div>
  );
}

export default LiveFaceRecognition;
