/**
 * VISÃO - useWebcam Hook
 * Camera access, capture, and lifecycle management
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

type WebcamStatus = 'loading' | 'ready' | 'captured' | 'error';

interface UseWebcamOptions {
  maxWidth?: number;
  maxHeight?: number;
  mirror?: boolean;
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
}

export function useWebcam({
  maxWidth = 800,
  maxHeight = 600,
  mirror = true,
  outputFormat = 'image/jpeg',
  quality = 0.9,
}: UseWebcamOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<WebcamStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(mirror);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: maxWidth }, height: { ideal: maxHeight } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('ready');
      }
    } catch (err) {
      logger.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') setError('Permissão de câmera negada. Por favor, permita o acesso à câmera.');
        else if (err.name === 'NotFoundError') setError('Nenhuma câmera encontrada no dispositivo.');
        else if (err.name === 'NotReadableError') setError('A câmera está sendo usada por outro aplicativo.');
        else setError('Erro ao acessar a câmera. Verifique as permissões.');
      } else {
        setError('Erro desconhecido ao acessar a câmera.');
      }
      setStatus('error');
    }
  }, [facingMode, maxWidth, maxHeight]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (isMirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL(outputFormat, quality);
    setCapturedImage(imageData);
    setStatus('captured');
    video.pause();
  }, [isMirrored, outputFormat, quality]);

  const retakePhoto = useCallback(async () => {
    setCapturedImage(null);
    if (videoRef.current) await videoRef.current.play();
    setStatus('ready');
  }, []);

  const confirmCapture = useCallback((onCapture: (imageData: string, file: File) => void) => {
    if (!capturedImage) return;
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const ext = outputFormat.split('/')[1];
        const file = new File([blob], `webcam-capture-${Date.now()}.${ext}`, { type: outputFormat });
        onCapture(capturedImage, file);
      });
  }, [capturedImage, outputFormat]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  useEffect(() => { startCamera(); return () => stopCamera(); }, [startCamera, stopCamera]);
  useEffect(() => { if (status !== 'captured') startCamera(); }, [facingMode]);

  return {
    videoRef, canvasRef, status, error, capturedImage, isMirrored, setIsMirrored,
    startCamera, capturePhoto, retakePhoto, confirmCapture, switchCamera,
  };
}
