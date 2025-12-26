/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceAPI
 *
 * Wrapper leve para face-api.js usado por:
 * - FaceRecognitionPage (detecção em UI)
 * - useFaceDetection (wrapper consolidado)
 * - useFaceRecognitionAlerts (tipos)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as faceapi from "face-api.js";

// ============================================
// TIPOS
// ============================================

export interface FaceDetection {
  box: { x: number; y: number; width: number; height: number };
  score?: number;
  descriptor?: Float32Array;
}

export type FaceMatchStatus = "known" | "unknown" | "blacklist" | "vip";

export interface FaceMatch {
  personId?: string;
  personName?: string;
  status?: FaceMatchStatus;
  similarity?: number;
  isMatch?: boolean;
}

interface UseFaceAPIOptions {
  autoLoadModels?: boolean;
}

interface UseFaceAPIReturn {
  modelsLoaded: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadModels: () => Promise<void>;
  detectFaces: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<FaceDetection[]>;
}

// ============================================
// HOOK
// ============================================

export function useFaceAPI(options: UseFaceAPIOptions = {}): UseFaceAPIReturn {
  const { autoLoadModels = false } = options;

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef<Promise<void> | null>(null);

  const modelUrl = useMemo(() => "/models", []); // public/models

  const loadModels = useCallback(async () => {
    if (modelsLoaded) return;
    if (loadingRef.current) return loadingRef.current;

    setIsLoading(true);
    setError(null);

    loadingRef.current = (async () => {
      try {
        // TinyFaceDetector é leve e suficiente para o overlay/preview
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
        // Landmarks + descriptor (para encoding/matching local)
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
        await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
        setModelsLoaded(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao carregar modelos";
        setError(msg);
        setModelsLoaded(false);
      } finally {
        setIsLoading(false);
        loadingRef.current = null;
      }
    })();

    return loadingRef.current;
  }, [modelUrl, modelsLoaded]);

  useEffect(() => {
    if (autoLoadModels) {
      void loadModels();
    }
  }, [autoLoadModels, loadModels]);

  const detectFaces = useCallback(
    async (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<FaceDetection[]> => {
      setError(null);

      if (!modelsLoaded) {
        await loadModels();
      }

      if (!faceapi.nets.tinyFaceDetector.isLoaded) return [];

      const detections = await faceapi
        .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      return detections.map((d) => ({
        box: {
          x: d.detection.box.x,
          y: d.detection.box.y,
          width: d.detection.box.width,
          height: d.detection.box.height,
        },
        score: d.detection.score,
        descriptor: d.descriptor,
      }));
    },
    [loadModels, modelsLoaded]
  );

  return {
    modelsLoaded,
    isLoaded: modelsLoaded,
    isLoading,
    error,
    loadModels,
    detectFaces,
  };
}

export default useFaceAPI;
