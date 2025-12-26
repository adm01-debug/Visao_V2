/**
 * Screen Capture Component
 * Screenshot and screen recording
 */

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Camera, Video, Square, Download, Trash2, Monitor, Copy, Check } from 'lucide-react';

export interface ScreenCaptureProps {
  onCapture?: (blob: Blob, url: string, type: 'image' | 'video') => void;
  onError?: (error: Error) => void;
  allowScreenshot?: boolean;
  allowRecording?: boolean;
  imageFormat?: 'png' | 'jpeg' | 'webp';
  imageQuality?: number;
  className?: string;
}

export const ScreenCapture: React.FC<ScreenCaptureProps> = ({
  onCapture,
  onError,
  allowScreenshot = true,
  allowRecording = true,
  imageFormat = 'png',
  imageQuality = 0.92,
  className,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedType, setCapturedType] = useState<'image' | 'video' | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const takeScreenshot = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      
      // @ts-ignore - ImageCapture API
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(bitmap, 0, 0);
      
      track.stop();
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setCapturedUrl(url);
            setCapturedType('image');
            onCapture?.(blob, url, 'image');
          }
        },
        `image/${imageFormat}`,
        imageQuality
      );
    } catch (error) {
      onError?.(error as Error);
    }
  }, [imageFormat, imageQuality, onCapture, onError]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        setCapturedType('video');
        onCapture?.(blob, url, 'video');
        stream.getTracks().forEach(track => track.stop());
      };

      // Stop when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        if (isRecording) stopRecording();
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      onError?.(error as Error);
    }
  }, [isRecording, onCapture, onError]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  }, []);

  const clearCapture = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedType(null);
    setRecordingDuration(0);
  }, [capturedUrl]);

  const downloadCapture = useCallback(() => {
    if (!capturedUrl) return;
    const link = document.createElement('a');
    link.href = capturedUrl;
    link.download = `screen-capture-${Date.now()}.${capturedType === 'image' ? imageFormat : 'webm'}`;
    link.click();
  }, [capturedUrl, capturedType, imageFormat]);

  const copyToClipboard = useCallback(async () => {
    if (!capturedUrl || capturedType !== 'image') return;
    try {
      const response = await fetch(capturedUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [capturedUrl, capturedType, onError]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('screen-capture', className)}>
      {/* Preview */}
      {capturedUrl && (
        <div className="mb-4">
          {capturedType === 'image' ? (
            <img src={capturedUrl} alt="Screenshot" className="w-full rounded-lg border" />
          ) : (
            <video src={capturedUrl} controls className="w-full rounded-lg" />
          )}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center justify-center gap-3 mb-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
          <span className="flex items-center gap-2 text-red-500">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            Gravando
          </span>
          <span className="font-mono text-lg">{formatDuration(recordingDuration)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isRecording && !capturedUrl && (
          <>
            {allowScreenshot && (
              <button
                onClick={takeScreenshot}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
              >
                <Camera className="h-5 w-5" />
                Screenshot
              </button>
            )}
            {allowRecording && (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Video className="h-5 w-5" />
                Gravar tela
              </button>
            )}
          </>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Square className="h-5 w-5" />
            Parar gravação
          </button>
        )}

        {capturedUrl && !isRecording && (
          <>
            <button
              onClick={clearCapture}
              className="p-3 border rounded-lg hover:bg-accent text-red-500"
              title="Descartar"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            
            {capturedType === 'image' && (
              <button
                onClick={copyToClipboard}
                className="p-3 border rounded-lg hover:bg-accent"
                title="Copiar"
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              </button>
            )}
            
            <button
              onClick={downloadCapture}
              className="p-3 border rounded-lg hover:bg-accent"
              title="Baixar"
            >
              <Download className="h-5 w-5" />
            </button>
            
            <button
              onClick={capturedType === 'image' ? takeScreenshot : startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              {capturedType === 'image' ? <Camera className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              Nova captura
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {!isRecording && !capturedUrl && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          <Monitor className="h-4 w-4 inline mr-1" />
          Selecione uma janela ou tela para capturar
        </p>
      )}
    </div>
  );
};

export default ScreenCapture;
