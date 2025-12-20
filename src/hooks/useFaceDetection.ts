/**
 * Hook para detecção facial usando a edge function detect-faces
 * Gera encoding facial automaticamente a partir de uma imagem
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  } | null;
  attributes: {
    age: number;
    gender: 'male' | 'female' | 'unknown';
    emotion: string;
    glasses: boolean;
    mask: boolean;
    beard: boolean;
  } | null;
  pose: {
    yaw: number;
    pitch: number;
    roll: number;
  } | null;
}

export interface FaceDetectionResult {
  success: boolean;
  faces: DetectedFace[];
  faceCount: number;
  imageQuality: 'good' | 'medium' | 'poor';
  processingNotes?: string;
  error?: string;
}

export interface FaceEncoding {
  version: string;
  timestamp: string;
  faces: DetectedFace[];
  primaryFace: DetectedFace | null;
  imageQuality: string;
}

export function useFaceDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FaceDetectionResult | null>(null);

  /**
   * Detecta faces em uma imagem base64
   */
  const detectFromBase64 = useCallback(async (
    imageBase64: string
  ): Promise<FaceDetectionResult> => {
    setIsDetecting(true);
    setError(null);
    
    try {
      // Remove o prefixo data URL se presente
      const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;

      const { data, error: fnError } = await supabase.functions.invoke('detect-faces', {
        body: { imageBase64: base64Data }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao chamar função de detecção');
      }

      const result: FaceDetectionResult = {
        success: data.success,
        faces: data.faces || [],
        faceCount: data.faceCount || 0,
        imageQuality: data.imageQuality || 'medium',
        processingNotes: data.processingNotes,
        error: data.error,
      };

      setLastResult(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      return {
        success: false,
        faces: [],
        faceCount: 0,
        imageQuality: 'poor',
        error: errorMsg,
      };
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * Detecta faces a partir de uma URL de imagem pública
   */
  const detectFromUrl = useCallback(async (
    imageUrl: string
  ): Promise<FaceDetectionResult> => {
    setIsDetecting(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('detect-faces', {
        body: { imageUrl }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao chamar função de detecção');
      }

      const result: FaceDetectionResult = {
        success: data.success,
        faces: data.faces || [],
        faceCount: data.faceCount || 0,
        imageQuality: data.imageQuality || 'medium',
        processingNotes: data.processingNotes,
        error: data.error,
      };

      setLastResult(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      return {
        success: false,
        faces: [],
        faceCount: 0,
        imageQuality: 'poor',
        error: errorMsg,
      };
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * Detecta faces a partir de um File
   */
  const detectFromFile = useCallback(async (
    file: File
  ): Promise<FaceDetectionResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await detectFromBase64(base64);
        resolve(result);
      };
      reader.onerror = () => {
        const errorMsg = 'Erro ao ler arquivo';
        setError(errorMsg);
        resolve({
          success: false,
          faces: [],
          faceCount: 0,
          imageQuality: 'poor',
          error: errorMsg,
        });
      };
      reader.readAsDataURL(file);
    });
  }, [detectFromBase64]);

  /**
   * Gera um encoding facial a partir do resultado da detecção
   * Este encoding pode ser salvo no banco para comparações futuras
   */
  const generateEncoding = useCallback((result: FaceDetectionResult): FaceEncoding | null => {
    if (!result.success || result.faceCount === 0) {
      return null;
    }

    // Seleciona a face com maior qualidade como face primária
    const primaryFace = result.faces.reduce((best, current) => {
      return current.quality > best.quality ? current : best;
    }, result.faces[0]);

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      faces: result.faces,
      primaryFace,
      imageQuality: result.imageQuality,
    };
  }, []);

  /**
   * Valida se a qualidade da face é suficiente para reconhecimento
   */
  const validateFaceQuality = useCallback((
    result: FaceDetectionResult,
    minQuality: number = 0.5
  ): { valid: boolean; message: string } => {
    if (!result.success) {
      return { valid: false, message: result.error || 'Falha na detecção' };
    }

    if (result.faceCount === 0) {
      return { valid: false, message: 'Nenhum rosto detectado na imagem' };
    }

    if (result.faceCount > 1) {
      return { valid: false, message: 'Múltiplos rostos detectados. Use uma foto individual.' };
    }

    const face = result.faces[0];
    if (face.quality < minQuality) {
      return { 
        valid: false, 
        message: `Qualidade da imagem insuficiente (${Math.round(face.quality * 100)}%). Use uma foto com melhor iluminação.` 
      };
    }

    if (face.pose) {
      const maxAngle = 30;
      if (Math.abs(face.pose.yaw) > maxAngle || Math.abs(face.pose.pitch) > maxAngle) {
        return { valid: false, message: 'Rosto não está de frente. Posicione o rosto de frente para a câmera.' };
      }
    }

    return { valid: true, message: 'Rosto detectado com qualidade adequada' };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isDetecting,
    error,
    lastResult,
    detectFromBase64,
    detectFromUrl,
    detectFromFile,
    generateEncoding,
    validateFaceQuality,
    clearError,
  };
}
