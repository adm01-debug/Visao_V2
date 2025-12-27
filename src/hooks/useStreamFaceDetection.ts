/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useStreamFaceDetection
 * 
 * Detecta rostos em frames de vídeo em tempo real usando a edge function detect-faces.
 * Integra com o FaceRecognitionOverlay para exibir detecções.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DetectedFace, ListType } from '@/components/FaceRecognitionOverlay';
import { toast } from 'sonner';
import { playAlertSound } from '@/lib/alertSounds';

// ============================================
// TIPOS
// ============================================

interface FaceDetectionResult {
  faces: Array<{
    bbox: [number, number, number, number]; // [x, y, width, height] em pixels
    confidence: number;
    landmarks?: unknown;
    attributes?: {
      age?: { min: number; max: number };
      gender?: { value: string; confidence: number };
      emotion?: { dominant: string; confidence: number };
    };
  }>;
  processing_time_ms?: number;
}

interface UseStreamFaceDetectionOptions {
  /** ID da câmera */
  cameraId: string;
  
  /** Intervalo entre detecções em ms */
  detectionIntervalMs?: number;
  
  /** Ativar detecção automaticamente */
  autoStart?: boolean;
  
  /** Callback quando rosto é detectado */
  onFaceDetected?: (faces: DetectedFace[]) => void;
  
  /** Callback para alertas (blacklist) */
  onAlert?: (face: DetectedFace) => void;
  
  /** Limiar de confiança mínimo */
  minConfidence?: number;
  
  /** Habilitar som de alerta */
  enableAlertSound?: boolean;
}

interface UseStreamFaceDetectionReturn {
  /** Rostos detectados atualmente */
  faces: DetectedFace[];
  
  /** Se está processando */
  isProcessing: boolean;
  
  /** Se está ativo */
  isActive: boolean;
  
  /** Último erro */
  error: string | null;
  
  /** Estatísticas */
  stats: {
    totalDetections: number;
    knownFaces: number;
    unknownFaces: number;
    alerts: number;
    avgProcessingTime: number;
  };
  
  /** Iniciar detecção */
  start: () => void;
  
  /** Parar detecção */
  stop: () => void;
  
  /** Processar frame manualmente */
  processFrame: (videoElement: HTMLVideoElement) => Promise<DetectedFace[]>;
  
  /** Limpar rostos */
  clearFaces: () => void;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useStreamFaceDetection({
  cameraId,
  detectionIntervalMs = 2000,
  autoStart = false,
  onFaceDetected,
  onAlert,
  minConfidence = 0.5,
  enableAlertSound = true,
}: UseStreamFaceDetectionOptions): UseStreamFaceDetectionReturn {
  // Estados
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActive, setIsActive] = useState(autoStart);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalDetections: 0,
    knownFaces: 0,
    unknownFaces: 0,
    alerts: 0,
    avgProcessingTime: 0,
  });

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const processingTimesRef = useRef<number[]>([]);
  const lastAlertTimeRef = useRef<Map<string, number>>(new Map());

  // Capturar frame do vídeo como base64
  const captureFrame = useCallback((videoElement: HTMLVideoElement): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Retornar base64 sem o prefixo data:image/jpeg;base64,
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      return dataUrl.replace(/^data:image\/\w+;base64,/, '');
    } catch (err) {
      return null;
    }
  }, []);

  // Buscar pessoa registrada pelo encoding usando edge function compare-faces
  const matchFaceWithRegistered = useCallback(async (
    faceEncoding: unknown
  ): Promise<{ personId?: string; personName?: string; listType: ListType; isKnown: boolean }> => {
    try {
      // Chamar edge function compare-faces
      const response = await supabase.functions.invoke('compare-faces', {
        body: { encoding: faceEncoding, threshold: 0.6 }
      });

      if (response.error) {
        console.error('Erro ao comparar faces:', response.error);
        return { listType: 'unknown', isKnown: false };
      }

      const result = response.data;
      
      if (result?.match && result?.person) {
        return {
          personId: result.person.id,
          personName: result.person.name,
          listType: result.person.list_type || 'whitelist',
          isKnown: true,
        };
      }

      return { listType: 'unknown', isKnown: false };
    } catch (error) {
      console.error('Erro na comparação de faces:', error);
      return { listType: 'unknown', isKnown: false };
    }
  }, []);

  // Processar frame e detectar rostos
  const processFrame = useCallback(async (videoElement: HTMLVideoElement): Promise<DetectedFace[]> => {
    if (isProcessing) return [];
    
    setIsProcessing(true);
    setError(null);
    const startTime = performance.now();

    try {
      const imageBase64 = captureFrame(videoElement);
      if (!imageBase64) {
        throw new Error('Falha ao capturar frame');
      }

      // Chamar edge function
      const { data, error: fnError } = await supabase.functions.invoke('detect-faces', {
        body: { imageBase64 },
      });

      if (fnError) throw fnError;
      
      const result = data as FaceDetectionResult;
      
      if (!result?.faces || result.faces.length === 0) {
        setFaces([]);
        return [];
      }

      // Converter para formato do overlay
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;
      
      const detectedFaces: DetectedFace[] = await Promise.all(
        result.faces
          .filter(f => f.confidence >= minConfidence)
          .map(async (face, index) => {
            const [x, y, width, height] = face.bbox;
            
            // Buscar match com pessoas registradas
            const matchResult = await matchFaceWithRegistered(null);
            
            const detectedFace: DetectedFace = {
              id: `${cameraId}-face-${index}-${Date.now()}`,
              boundingBox: {
                x: (x / videoWidth) * 100,
                y: (y / videoHeight) * 100,
                width: (width / videoWidth) * 100,
                height: (height / videoHeight) * 100,
              },
              personId: matchResult.personId,
              personName: matchResult.personName,
              listType: matchResult.listType,
              similarity: face.confidence,
              isKnown: matchResult.isKnown,
              timestamp: new Date(),
              emotions: face.attributes?.emotion ? {
                dominant: face.attributes.emotion.dominant,
                confidence: face.attributes.emotion.confidence,
              } : undefined,
              age: face.attributes?.age,
              gender: face.attributes?.gender,
            };

            return detectedFace;
          })
      );

      // Atualizar estatísticas
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      processingTimesRef.current.push(processingTime);
      if (processingTimesRef.current.length > 10) {
        processingTimesRef.current.shift();
      }

      const avgTime = processingTimesRef.current.reduce((a, b) => a + b, 0) / processingTimesRef.current.length;
      
      setStats(prev => ({
        totalDetections: prev.totalDetections + detectedFaces.length,
        knownFaces: prev.knownFaces + detectedFaces.filter(f => f.isKnown).length,
        unknownFaces: prev.unknownFaces + detectedFaces.filter(f => !f.isKnown).length,
        alerts: prev.alerts + detectedFaces.filter(f => f.listType === 'blacklist').length,
        avgProcessingTime: Math.round(avgTime),
      }));

      // Verificar alertas
      for (const face of detectedFaces) {
        if (face.listType === 'blacklist') {
          const lastAlert = lastAlertTimeRef.current.get(face.personId || 'unknown');
          const now = Date.now();
          
          // Cooldown de 30 segundos entre alertas para mesma pessoa
          if (!lastAlert || now - lastAlert > 30000) {
            lastAlertTimeRef.current.set(face.personId || 'unknown', now);
            
            if (enableAlertSound) {
              playAlertSound('critical');
            }
            
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
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [cameraId, captureFrame, isProcessing, matchFaceWithRegistered, minConfidence, enableAlertSound, onAlert, onFaceDetected]);

  // Iniciar detecção contínua
  const start = useCallback(() => {
    setIsActive(true);
    setError(null);
  }, []);

  // Parar detecção
  const stop = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Limpar rostos
  const clearFaces = useCallback(() => {
    setFaces([]);
  }, []);

  // Efeito para loop de detecção
  useEffect(() => {
    if (!isActive) return;

    // Encontrar elemento de vídeo da câmera
    const findVideoElement = (): HTMLVideoElement | null => {
      // Tentar encontrar por data attribute
      const video = document.querySelector(`video[data-camera-id="${cameraId}"]`) as HTMLVideoElement;
      if (video) return video;
      
      // Fallback: primeiro vídeo visível
      const videos = document.querySelectorAll('video');
      for (const v of videos) {
        if (v.readyState >= 2 && v.videoWidth > 0) {
          return v as HTMLVideoElement;
        }
      }
      
      return null;
    };

    const runDetection = () => {
      const video = findVideoElement();
      if (video && video.readyState >= 2) {
        videoRef.current = video;
        processFrame(video);
      }
    };

    // Executar imediatamente
    const initialTimeout = setTimeout(runDetection, 1000);

    // Configurar intervalo
    intervalRef.current = setInterval(runDetection, detectionIntervalMs);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, cameraId, detectionIntervalMs, processFrame]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    faces,
    isProcessing,
    isActive,
    error,
    stats,
    start,
    stop,
    processFrame,
    clearFaces,
  };
}

export default useStreamFaceDetection;
