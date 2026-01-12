import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Camera, RotateCcw, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture?: (dataUrl: string) => void;
  facingMode?: 'user' | 'environment';
  className?: string;
}

export function CameraCapture({ onCapture, facingMode = 'environment', className }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setStreaming(true); }
    } catch (e) { console.error('Camera error'); }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setStreaming(false);
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    setPhoto(dataUrl);
    onCapture?.(dataUrl);
    stopCamera();
  }, [onCapture, stopCamera]);

  const retake = () => { setPhoto(null); startCamera(); };

  return (
    <div className={cn('rounded-lg overflow-hidden border bg-black', className)}>
      {photo ? (
        <div className="relative">
          <img src={photo} alt="Captured" className="w-full" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button onClick={retake}><RotateCcw className="h-4 w-4 mr-1" />Refazer</Button>
            <a href={photo} download="photo.png"><Button variant="secondary"><Download className="h-4 w-4 mr-1" />Salvar</Button></a>
          </div>
        </div>
      ) : streaming ? (
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline className="w-full" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button onClick={capture}><Camera className="h-4 w-4 mr-1" />Capturar</Button>
            <Button variant="secondary" onClick={stopCamera}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <Button onClick={startCamera}>Iniciar Câmera</Button>
        </div>
      )}
    </div>
  );
}

export default CameraCapture;
