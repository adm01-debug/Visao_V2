/**
 * useStreamFaceDetection (Refactored)
 * Types extracted to ./stream-face-detection/streamFaceTypes.ts
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DetectedFace, ListType } from '@/components/FaceRecognitionOverlay';
import { toast } from 'sonner';
import { playAlertSound } from '@/lib/alertSounds';
import type {
  FaceDetectionResult,
  UseStreamFaceDetectionOptions,
  FaceDetectionStats,
  UseStreamFaceDetectionReturn,
} from './stream-face-detection/streamFaceTypes';

export type { UseStreamFaceDetectionOptions, UseStreamFaceDetectionReturn };

export function useStreamFaceDetection({
  cameraId,
  detectionIntervalMs = 2000,
  autoStart = false,
  onFaceDetected,
  onAlert,
  minConfidence = 0.5,
  enableAlertSound = true,
}: UseStreamFaceDetectionOptions): UseStreamFaceDetectionReturn {
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActive, setIsActive] = useState(autoStart);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FaceDetectionStats>({
    totalDetections: 0,
    knownFaces: 0,
    unknownFaces: 0,
    alerts: 0,
    avgProcessingTime: 0,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const processingTimesRef = useRef<number[]>([]);
  const lastAlertTimeRef = useRef<Map<string, number>>(new Map());

  const captureFrame = useCallback((video: HTMLVideoElement): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8).replace(/^data:image\/\w+;base64,/, '');
    } catch {
      return null;
    }
  }, []);

  const matchFaceWithRegistered = useCallback(
    async (
      faceEncoding: unknown
    ): Promise<{
      personId?: string;
      personName?: string;
      listType: ListType;
      isKnown: boolean;
    }> => {
      try {
        const response = await supabase.functions.invoke('compare-faces', {
          body: { encoding: faceEncoding, threshold: 0.6 },
        });
        if (response.error) return { listType: 'unknown', isKnown: false };
        const result = response.data;
        if (result?.match && result?.person)
          return {
            personId: result.person.id,
            personName: result.person.name,
            listType: result.person.list_type || 'whitelist',
            isKnown: true,
          };
        return { listType: 'unknown', isKnown: false };
      } catch {
        return { listType: 'unknown', isKnown: false };
      }
    },
    []
  );

  const processFrame = useCallback(
    async (videoElement: HTMLVideoElement): Promise<DetectedFace[]> => {
      if (isProcessing) return [];
      setIsProcessing(true);
      setError(null);
      const startTime = performance.now();
      try {
        const imageBase64 = captureFrame(videoElement);
        if (!imageBase64) throw new Error('Falha ao capturar frame');
        const { data, error: fnError } = await supabase.functions.invoke('detect-faces', {
          body: { imageBase64 },
        });
        if (fnError) throw fnError;
        const result = data as FaceDetectionResult;
        if (!result?.faces || result.faces.length === 0) {
          setFaces([]);
          return [];
        }
        const vw = videoElement.videoWidth || 640;
        const vh = videoElement.videoHeight || 480;
        const detectedFaces: DetectedFace[] = await Promise.all(
          result.faces
            .filter((f) => f.confidence >= minConfidence)
            .map(async (face, index) => {
              const [x, y, width, height] = face.bbox;
              const matchResult = await matchFaceWithRegistered(null);
              return {
                id: `${cameraId}-face-${index}-${Date.now()}`,
                boundingBox: {
                  x: (x / vw) * 100,
                  y: (y / vh) * 100,
                  width: (width / vw) * 100,
                  height: (height / vh) * 100,
                },
                personId: matchResult.personId,
                personName: matchResult.personName,
                listType: matchResult.listType,
                similarity: face.confidence,
                isKnown: matchResult.isKnown,
                timestamp: new Date(),
                emotions: face.attributes?.emotion
                  ? {
                      dominant: face.attributes.emotion.dominant,
                      confidence: face.attributes.emotion.confidence,
                    }
                  : undefined,
                age: face.attributes?.age,
                gender: face.attributes?.gender,
              };
            })
        );
        const endTime = performance.now();
        const pt = endTime - startTime;
        processingTimesRef.current.push(pt);
        if (processingTimesRef.current.length > 10) processingTimesRef.current.shift();
        const avgTime =
          processingTimesRef.current.reduce((a, b) => a + b, 0) / processingTimesRef.current.length;
        setStats((prev) => ({
          totalDetections: prev.totalDetections + detectedFaces.length,
          knownFaces: prev.knownFaces + detectedFaces.filter((f) => f.isKnown).length,
          unknownFaces: prev.unknownFaces + detectedFaces.filter((f) => !f.isKnown).length,
          alerts: prev.alerts + detectedFaces.filter((f) => f.listType === 'blacklist').length,
          avgProcessingTime: Math.round(avgTime),
        }));
        for (const face of detectedFaces) {
          if (face.listType === 'blacklist') {
            const last = lastAlertTimeRef.current.get(face.personId || 'unknown');
            if (!last || Date.now() - last > 30000) {
              lastAlertTimeRef.current.set(face.personId || 'unknown', Date.now());
              if (enableAlertSound) playAlertSound('critical');
              toast.error('ALERTA: Pessoa bloqueada detectada!', {
                description: face.personName || 'Pessoa não identificada',
                duration: 10000,
              });
              onAlert?.(face);
            }
          }
        }
        setFaces(detectedFaces);
        onFaceDetected?.(detectedFaces);
        return detectedFaces;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        return [];
      } finally {
        setIsProcessing(false);
      }
    },
    [
      cameraId,
      captureFrame,
      isProcessing,
      matchFaceWithRegistered,
      minConfidence,
      enableAlertSound,
      onAlert,
      onFaceDetected,
    ]
  );

  const start = useCallback(() => {
    setIsActive(true);
    setError(null);
  }, []);
  const stop = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  const clearFaces = useCallback(() => setFaces([]), []);

  useEffect(() => {
    if (!isActive) return;
    const findVideo = (): HTMLVideoElement | null => {
      const v = document.querySelector(`video[data-camera-id="${cameraId}"]`) as HTMLVideoElement;
      if (v) return v;
      for (const el of document.querySelectorAll('video')) {
        if ((el as HTMLVideoElement).readyState >= 2 && (el as HTMLVideoElement).videoWidth > 0)
          return el as HTMLVideoElement;
      }
      return null;
    };
    const run = () => {
      const v = findVideo();
      if (v && v.readyState >= 2) {
        videoRef.current = v;
        processFrame(v);
      }
    };
    const t = setTimeout(run, 1000);
    intervalRef.current = setInterval(run, detectionIntervalMs);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, cameraId, detectionIntervalMs, processFrame]);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    []
  );

  return { faces, isProcessing, isActive, error, stats, start, stop, processFrame, clearFaces };
}

export default useStreamFaceDetection;
