import { logger } from "@/lib/logger";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: WebcamCapture
 * 
 * Captura de foto via webcam para reconhecimento facial
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Check,
  X,
  FlipHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

export interface WebcamCaptureProps {
  /** Callback quando uma foto é capturada */
  onCapture: (imageData: string, file: File) => void;
  /** Callback para cancelar */
  onCancel: () => void;
  /** Qualidade da imagem (0-1, padrão: 0.9) */
  quality?: number;
  /** Largura máxima da imagem capturada */
  maxWidth?: number;
  /** Altura máxima da imagem capturada */
  maxHeight?: number;
  /** Espelhar a prévia (padrão: true) */
  mirror?: boolean;
  /** Formato de saída (padrão: image/jpeg) */
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export function WebcamCapture({
  onCapture,
  onCancel,
  quality = 0.9,
  maxWidth = 800,
  maxHeight = 600,
  mirror = true,
  outputFormat = 'image/jpeg',
  className,
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'captured' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(mirror);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Iniciar webcam
  const startCamera = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      // Parar stream anterior se existir
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: maxWidth },
          height: { ideal: maxHeight },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('ready');
      }
    } catch (err) {
      logger.error('Camera error:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Por favor, permita o acesso à câmera.');
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada no dispositivo.');
        } else if (err.name === 'NotReadableError') {
          setError('A câmera está sendo usada por outro aplicativo.');
        } else {
          setError('Erro ao acessar a câmera. Verifique as permissões.');
        }
      } else {
        setError('Erro desconhecido ao acessar a câmera.');
      }
      
      setStatus('error');
    }
  }, [facingMode, maxWidth, maxHeight]);

  // Parar webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Capturar foto
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Definir tamanho do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Aplicar espelhamento se necessário
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Desenhar frame do vídeo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converter para base64
    const imageData = canvas.toDataURL(outputFormat, quality);
    setCapturedImage(imageData);
    setStatus('captured');

    // Pausar o vídeo
    video.pause();
  }, [isMirrored, outputFormat, quality]);

  // Refazer captura
  const retakePhoto = useCallback(async () => {
    setCapturedImage(null);
    const video = videoRef.current;
    if (video) {
      await video.play();
    }
    setStatus('ready');
  }, []);

  // Confirmar captura
  const confirmCapture = useCallback(() => {
    if (!capturedImage) return;

    // Converter base64 para File
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const ext = outputFormat.split('/')[1];
        const fileName = `webcam-capture-${Date.now()}.${ext}`;
        const file = new File([blob], fileName, { type: outputFormat });
        onCapture(capturedImage, file);
      });
  }, [capturedImage, outputFormat, onCapture]);

  // Trocar câmera (frontal/traseira)
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Iniciar câmera ao montar
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Reiniciar quando mudar facingMode
  useEffect(() => {
    if (status !== 'captured') {
      startCamera();
    }
  }, [facingMode]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Preview */}
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        {/* Vídeo */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            isMirrored && 'scale-x-[-1]',
            status === 'captured' && 'hidden'
          )}
        />

        {/* Canvas para captura (invisível) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Imagem capturada */}
        {status === 'captured' && capturedImage && (
          <img
            src={capturedImage}
            alt="Foto capturada"
            className="w-full h-full object-cover"
          />
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Iniciando câmera...</p>
            </div>
          </div>
        )}

        {/* Erro */}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-4">
            <div className="text-center text-white">
              <CameraOff className="w-12 h-12 mx-auto mb-3 text-destructive" />
              <p className="text-sm mb-4">{error}</p>
              <Button variant="secondary" size="sm" onClick={startCamera}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Guia de posicionamento do rosto */}
        {status === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-60 border-2 border-dashed border-white/50 rounded-full" />
          </div>
        )}

        {/* Badge de status */}
        {status === 'ready' && (
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/90 text-white text-xs rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Câmera ativa
            </div>
          </div>
        )}

        {/* Controles de câmera */}
        {status === 'ready' && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-black/50 hover:bg-black/70"
              onClick={() => setIsMirrored(!isMirrored)}
              title={isMirrored ? 'Desativar espelhamento' : 'Ativar espelhamento'}
            >
              <FlipHorizontal className="w-4 h-4 text-white" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-black/50 hover:bg-black/70"
              onClick={switchCamera}
              title="Trocar câmera"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </Button>
          </div>
        )}
      </div>

      {/* Instruções */}
      {status === 'ready' && (
        <p className="text-xs text-center text-muted-foreground">
          Posicione o rosto dentro do guia oval e clique em "Capturar"
        </p>
      )}

      {/* Botões de ação */}
      <div className="flex items-center gap-2">
        {status === 'ready' && (
          <>
            <Button variant="outline" onClick={onCancel} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={capturePhoto} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Capturar
            </Button>
          </>
        )}

        {status === 'captured' && (
          <>
            <Button variant="outline" onClick={retakePhoto} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refazer
            </Button>
            <Button onClick={confirmCapture} className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              Usar esta foto
            </Button>
          </>
        )}

        {status === 'error' && (
          <Button variant="outline" onClick={onCancel} className="w-full">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        )}

        {status === 'loading' && (
          <Button variant="outline" onClick={onCancel} className="w-full">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
