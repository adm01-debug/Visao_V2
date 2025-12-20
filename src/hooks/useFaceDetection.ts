/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceDetection (CONSOLIDADO)
 * 
 * Este hook agora é um wrapper que usa:
 * - useFaceAPI para detecção local via face-api.js
 * - Edge functions como fallback para servidor
 * 
 * Mantido para retrocompatibilidade com componentes Lovable
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFaceAPI, FaceDetection as FaceAPIDetection } from './useFaceAPI';

// ============================================
// TIPOS (Compatíveis com versão Lovable)
// ============================================

export interface DetectedFace {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  quality: number;
  landmarks: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
  encoding?: number[];
}

export interface UseFaceDetectionOptions {
  useLocalDetection?: boolean; // Usar face-api.js local (padrão: true)
  autoLoadModels?: boolean;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useFaceDetection(options: UseFaceDetectionOptions = {}) {
  const { useLocalDetection = true, autoLoadModels = true } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usar hook de face-api.js
  const faceAPI = useFaceAPI({
    autoLoadModels,
  });

  /**
   * Detectar rostos usando face-api.js local
   */
  const detectFacesLocal = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectedFace[]> => {
    const detections = await faceAPI.detectFaces(input);

    return detections.map(d => ({
      boundingBox: {
        x: d.box.x,
        y: d.box.y,
        width: d.box.width,
        height: d.box.height,
      },
      confidence: 0.9,
      quality: 0.8,
      landmarks: {
        leftEye: { x: d.box.x + d.box.width * 0.3, y: d.box.y + d.box.height * 0.35 },
        rightEye: { x: d.box.x + d.box.width * 0.7, y: d.box.y + d.box.height * 0.35 },
        nose: { x: d.box.x + d.box.width * 0.5, y: d.box.y + d.box.height * 0.55 },
        leftMouth: { x: d.box.x + d.box.width * 0.35, y: d.box.y + d.box.height * 0.75 },
        rightMouth: { x: d.box.x + d.box.width * 0.65, y: d.box.y + d.box.height * 0.75 },
      },
      encoding: d.descriptor ? Array.from(d.descriptor) : undefined,
    }));
  }, [faceAPI]);

  /**
   * Detectar rostos usando Edge Function (fallback)
   */
  const detectFacesRemote = useCallback(async (
    imageBase64: string
  ): Promise<DetectedFace[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('detect-faces', {
        body: { imageBase64 },
      });

      if (fnError) throw fnError;
      return data?.faces || [];
    } catch (err: any) {
      console.error('[FaceDetection] Edge function error:', err);
      throw err;
    }
  }, []);

  /**
   * Detectar rostos (auto-seleciona método)
   */
  const detectFaces = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | string
  ): Promise<DetectedFace[]> => {
    setIsProcessing(true);
    setError(null);

    try {
      // Se input é string (base64), usar edge function
      if (typeof input === 'string') {
        return await detectFacesRemote(input);
      }

      // Se local detection habilitado e modelos carregados
      if (useLocalDetection && faceAPI.modelsLoaded) {
        return await detectFacesLocal(input);
      }

      // Fallback: converter para base64 e usar edge function
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      if (input instanceof HTMLVideoElement) {
        canvas.width = input.videoWidth;
        canvas.height = input.videoHeight;
        ctx.drawImage(input, 0, 0);
      } else if (input instanceof HTMLImageElement) {
        canvas.width = input.naturalWidth;
        canvas.height = input.naturalHeight;
        ctx.drawImage(input, 0, 0);
      } else {
        canvas.width = input.width;
        canvas.height = input.height;
        ctx.drawImage(input, 0, 0);
      }

      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      return await detectFacesRemote(base64.split(',')[1]);
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [useLocalDetection, faceAPI.modelsLoaded, detectFacesLocal, detectFacesRemote]);

  /**
   * Gerar encoding facial
   */
  const generateEncoding = useCallback(async (
    imageBase64: string,
    personId?: string
  ): Promise<number[] | null> => {
    setIsProcessing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-face-encoding', {
        body: { imageBase64, personId },
      });

      if (fnError) throw fnError;
      return data?.encoding || null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Validar qualidade da imagem para face detection
   */
  const validateImageQuality = useCallback((face: DetectedFace): {
    isValid: boolean;
    issues: string[];
  } => {
    const issues: string[] = [];

    if (face.confidence < 0.7) {
      issues.push('Baixa confiança na detecção');
    }

    if (face.quality < 0.5) {
      issues.push('Qualidade da imagem insuficiente');
    }

    if (face.boundingBox.width < 80 || face.boundingBox.height < 80) {
      issues.push('Rosto muito pequeno na imagem');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }, []);

  return {
    detectFaces,
    generateEncoding,
    validateImageQuality,
    isProcessing,
    error,
    modelsLoaded: faceAPI.modelsLoaded,
    loadModels: faceAPI.loadModels,
  };
}

export default useFaceDetection;
