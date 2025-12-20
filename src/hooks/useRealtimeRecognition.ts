/**
 * Hook para reconhecimento facial em tempo real
 * Captura frames de uma câmera/vídeo e compara com pessoas cadastradas
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecognizedFace {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  quality: number;
  attributes?: {
    age?: number;
    gender?: string;
    emotion?: string;
    glasses?: boolean;
    mask?: boolean;
    beard?: boolean;
  };
  isKnown: boolean;
  bestMatch?: {
    personId: string;
    personName: string;
    photoUrl: string | null;
    listType: string | null;
    similarity: number;
  };
  timestamp: Date;
}

export interface RealtimeRecognitionConfig {
  /** Intervalo entre capturas em ms */
  captureInterval: number;
  /** Threshold de similaridade para match (0-1) */
  matchThreshold: number;
  /** Qualidade mínima para processar face */
  minQuality: number;
  /** Máximo de faces por frame */
  maxFaces: number;
  /** Gerar alertas para desconhecidos */
  alertOnUnknown: boolean;
  /** Gerar alertas para blacklist */
  alertOnBlacklist: boolean;
  /** Cooldown de alertas em segundos */
  alertCooldown: number;
}

const defaultConfig: RealtimeRecognitionConfig = {
  captureInterval: 2000, // 2 segundos
  matchThreshold: 0.6,
  minQuality: 0.4,
  maxFaces: 5,
  alertOnUnknown: false,
  alertOnBlacklist: true,
  alertCooldown: 60,
};

export interface UseRealtimeRecognitionOptions {
  cameraId?: string;
  cameraName?: string;
  config?: Partial<RealtimeRecognitionConfig>;
  onFaceRecognized?: (face: RecognizedFace) => void;
  onUnknownFace?: (face: RecognizedFace) => void;
  onBlacklistDetected?: (face: RecognizedFace) => void;
  onError?: (error: string) => void;
}

export function useRealtimeRecognition(options: UseRealtimeRecognitionOptions = {}) {
  const {
    cameraId = 'default',
    cameraName = 'Câmera',
    config: userConfig,
    onFaceRecognized,
    onUnknownFace,
    onBlacklistDetected,
    onError,
  } = options;

  const config = { ...defaultConfig, ...userConfig };

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [recognizedFaces, setRecognizedFaces] = useState<RecognizedFace[]>([]);
  const [stats, setStats] = useState({
    totalDetections: 0,
    knownFaces: 0,
    unknownFaces: 0,
    lastProcessingTime: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertCooldownRef = useRef<Map<string, number>>(new Map());

  /**
   * Captura um frame do vídeo como base64
   */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Converter para base64 (qualidade 80%)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1];
  }, []);

  /**
   * Processa um frame para reconhecimento facial
   */
  const processFrame = useCallback(async (imageBase64: string): Promise<RecognizedFace[]> => {
    const startTime = Date.now();
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('compare-faces', {
        body: {
          imageBase64,
          cameraId,
          threshold: config.matchThreshold,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        if (data.error === 'Rate limit exceeded') {
          // Silently skip on rate limit
          return [];
        }
        throw new Error(data.error);
      }

      const processingTime = Date.now() - startTime;
      const faces: RecognizedFace[] = [];

      for (const result of (data.results || [])) {
        const face: RecognizedFace = {
          id: `face-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          boundingBox: result.detectedFace.boundingBox,
          confidence: result.detectedFace.confidence,
          quality: result.detectedFace.quality,
          attributes: result.detectedFace.attributes,
          isKnown: result.isKnown,
          bestMatch: result.bestMatch,
          timestamp: new Date(),
        };

        faces.push(face);

        // Callbacks e alertas
        if (result.isKnown && result.bestMatch) {
          onFaceRecognized?.(face);

          // Verificar blacklist
          if (result.bestMatch.listType === 'blacklist' && config.alertOnBlacklist) {
            const cooldownKey = `blacklist-${result.bestMatch.personId}`;
            const lastAlert = alertCooldownRef.current.get(cooldownKey) || 0;
            
            if (Date.now() - lastAlert > config.alertCooldown * 1000) {
              alertCooldownRef.current.set(cooldownKey, Date.now());
              onBlacklistDetected?.(face);
              toast.error(`ALERTA: ${result.bestMatch.personName} (bloqueado) detectado!`, {
                duration: 10000,
              });
            }
          }
        } else {
          onUnknownFace?.(face);

          if (config.alertOnUnknown) {
            const cooldownKey = `unknown-${cameraId}`;
            const lastAlert = alertCooldownRef.current.get(cooldownKey) || 0;
            
            if (Date.now() - lastAlert > config.alertCooldown * 1000) {
              alertCooldownRef.current.set(cooldownKey, Date.now());
              toast.warning('Pessoa não identificada detectada', {
                duration: 5000,
              });
            }
          }
        }
      }

      // Atualizar estado
      setRecognizedFaces(prev => {
        // Manter faces dos últimos 5 segundos + novas faces
        const now = Date.now();
        const recentFaces = prev.filter(f => now - f.timestamp.getTime() < 5000);
        return [...recentFaces, ...faces];
      });

      setStats(prev => ({
        totalDetections: prev.totalDetections + faces.length,
        knownFaces: prev.knownFaces + faces.filter(f => f.isKnown).length,
        unknownFaces: prev.unknownFaces + faces.filter(f => !f.isKnown).length,
        lastProcessingTime: processingTime,
      }));

      return faces;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      onError?.(errorMsg);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [cameraId, config, onFaceRecognized, onUnknownFace, onBlacklistDetected, onError]);

  /**
   * Inicia o reconhecimento contínuo
   */
  const start = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    videoRef.current = video;
    canvasRef.current = canvas;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRunning(true);

    const captureAndProcess = async () => {
      if (!isProcessing) {
        const frame = captureFrame();
        if (frame) {
          await processFrame(frame);
        }
      }
    };

    // Primeira captura
    captureAndProcess();

    // Configurar intervalo
    intervalRef.current = setInterval(captureAndProcess, config.captureInterval);
  }, [captureFrame, processFrame, config.captureInterval, isProcessing]);

  /**
   * Para o reconhecimento
   */
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    videoRef.current = null;
    canvasRef.current = null;
  }, []);

  /**
   * Processa uma única imagem (manual)
   */
  const processImage = useCallback(async (imageBase64: string) => {
    return processFrame(imageBase64);
  }, [processFrame]);

  /**
   * Limpa as faces reconhecidas
   */
  const clearFaces = useCallback(() => {
    setRecognizedFaces([]);
  }, []);

  /**
   * Reseta estatísticas
   */
  const resetStats = useCallback(() => {
    setStats({
      totalDetections: 0,
      knownFaces: 0,
      unknownFaces: 0,
      lastProcessingTime: 0,
    });
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isProcessing,
    isRunning,
    recognizedFaces,
    stats,
    error,
    start,
    stop,
    processImage,
    clearFaces,
    resetStats,
  };
}
