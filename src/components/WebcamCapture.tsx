import { logger } from "@/lib/logger";
/**
 * VISÃO - WebcamCapture Component (refactored)
 * Captura de foto via webcam para reconhecimento facial
 */
import { Camera, CameraOff, RefreshCw, Check, X, FlipHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWebcam } from './webcam/useWebcam';

export interface WebcamCaptureProps {
  onCapture: (imageData: string, file: File) => void;
  onCancel: () => void;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  mirror?: boolean;
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  className?: string;
}

export function WebcamCapture({
  onCapture, onCancel, quality = 0.9, maxWidth = 800, maxHeight = 600,
  mirror = true, outputFormat = 'image/jpeg', className,
}: WebcamCaptureProps) {
  const {
    videoRef, canvasRef, status, error, capturedImage, isMirrored, setIsMirrored,
    startCamera, capturePhoto, retakePhoto, confirmCapture, switchCamera,
  } = useWebcam({ maxWidth, maxHeight, mirror, outputFormat, quality });

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Preview */}
      <div className="relative aspect-[4/3] bg-foreground rounded-lg overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted
          className={cn('w-full h-full object-cover', isMirrored && 'scale-x-[-1]', status === 'captured' && 'hidden')}
        />
        <canvas ref={canvasRef} className="hidden" />

        {status === 'captured' && capturedImage && (
          <img src={capturedImage} alt="Foto capturada" className="w-full h-full object-cover" />
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/80">
            <div className="text-center text-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Iniciando câmera...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/90 p-4">
            <div className="text-center text-foreground">
              <CameraOff className="w-12 h-12 mx-auto mb-3 text-destructive" />
              <p className="text-sm mb-4">{error}</p>
              <Button variant="secondary" size="sm" onClick={startCamera}>
                <RefreshCw className="w-4 h-4 mr-2" />Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-60 border-2 border-dashed border-white/50 rounded-full" />
            </div>
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-success/90 text-success-foreground text-xs rounded-full">
                <div className="w-2 h-2 bg-background rounded-full animate-pulse" />
                Câmera ativa
              </div>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <Button variant="secondary" size="icon" className="h-8 w-8 bg-foreground/50 hover:bg-foreground/70"
                onClick={() => setIsMirrored(!isMirrored)} title={isMirrored ? 'Desativar espelhamento' : 'Ativar espelhamento'}>
                <FlipHorizontal className="w-4 h-4 text-foreground" />
              </Button>
              <Button variant="secondary" size="icon" className="h-8 w-8 bg-foreground/50 hover:bg-foreground/70"
                onClick={switchCamera} title="Trocar câmera">
                <RefreshCw className="w-4 h-4 text-foreground" />
              </Button>
            </div>
          </>
        )}
      </div>

      {status === 'ready' && (
        <p className="text-xs text-center text-muted-foreground">
          Posicione o rosto dentro do guia oval e clique em "Capturar"
        </p>
      )}

      <div className="flex items-center gap-2">
        {status === 'ready' && (
          <>
            <Button variant="outline" onClick={onCancel} className="flex-1"><X className="w-4 h-4 mr-2" />Cancelar</Button>
            <Button onClick={capturePhoto} className="flex-1"><Camera className="w-4 h-4 mr-2" />Capturar</Button>
          </>
        )}
        {status === 'captured' && (
          <>
            <Button variant="outline" onClick={retakePhoto} className="flex-1"><RefreshCw className="w-4 h-4 mr-2" />Refazer</Button>
            <Button onClick={() => confirmCapture(onCapture)} className="flex-1"><Check className="w-4 h-4 mr-2" />Usar esta foto</Button>
          </>
        )}
        {(status === 'error' || status === 'loading') && (
          <Button variant="outline" onClick={onCancel} className="w-full"><X className="w-4 h-4 mr-2" />Cancelar</Button>
        )}
      </div>
    </div>
  );
}
