/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useMLModels (IMPLEMENTAÇÃO REAL)
 * 
 * Gerenciamento de modelos TensorFlow.js:
 * - COCO-SSD para detecção de objetos
 * - MoveNet para detecção de poses
 * - Carregamento lazy e caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { toast } from 'sonner';

// Debug log condicional (apenas em desenvolvimento)
const debugLog = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
  }
};

// ============================================
// TIPOS
// ============================================

export type ModelType = 'coco-ssd' | 'movenet' | 'blazeface';
export type BackendType = 'webgl' | 'wasm' | 'cpu';

export interface ModelInfo {
  type: ModelType;
  name: string;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadTime?: number;
  inferenceTime?: number;
}

export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export interface PoseKeypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

export interface DetectedPose {
  keypoints: PoseKeypoint[];
  score: number;
}

export interface MLModelsConfig {
  backend: BackendType;
  maxDetections: number;
  minScore: number;
  warmupRuns: number;
  enableGPU: boolean;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const DEFAULT_CONFIG: MLModelsConfig = {
  backend: 'webgl',
  maxDetections: 20,
  minScore: 0.5,
  warmupRuns: 1,
  enableGPU: true,
};

// Classes de interesse
const PERSON_CLASSES = ['person'];
const VEHICLE_CLASSES = ['car', 'motorcycle', 'bus', 'truck', 'bicycle'];

// ============================================
// SINGLETON PARA CACHE DE MODELOS
// ============================================

class ModelCache {
  private static instance: ModelCache;
  private cocoModel: cocoSsd.ObjectDetection | null = null;
  private poseDetector: poseDetection.PoseDetector | null = null;
  private backendReady = false;

  static getInstance(): ModelCache {
    if (!ModelCache.instance) {
      ModelCache.instance = new ModelCache();
    }
    return ModelCache.instance;
  }

  async initBackend(preferGPU: boolean): Promise<string> {
    if (this.backendReady) {
      return tf.getBackend();
    }

    try {
      // Tentar WebGL primeiro se GPU habilitada
      if (preferGPU) {
        await tf.setBackend('webgl');
        await tf.ready();
        this.backendReady = true;
        debugLog('[ML] TensorFlow.js usando WebGL');
        return 'webgl';
      }
    } catch (e) {
      
    }

    try {
      // Tentar WASM
      await tf.setBackend('wasm');
      await tf.ready();
      this.backendReady = true;
      debugLog('[ML] TensorFlow.js usando WASM');
      return 'wasm';
    } catch (e) {
      
    }

    // Fallback para CPU
    await tf.setBackend('cpu');
    await tf.ready();
    this.backendReady = true;
    debugLog('[ML] TensorFlow.js usando CPU');
    return 'cpu';
  }

  async getCocoModel(): Promise<cocoSsd.ObjectDetection> {
    if (!this.cocoModel) {
      debugLog('[ML] Carregando COCO-SSD...');
      this.cocoModel = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });
      debugLog('[ML] COCO-SSD carregado');
    }
    return this.cocoModel;
  }

  async getPoseDetector(): Promise<poseDetection.PoseDetector> {
    if (!this.poseDetector) {
      debugLog('[ML] Carregando MoveNet...');
      this.poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        }
      );
      debugLog('[ML] MoveNet carregado');
    }
    return this.poseDetector;
  }

  disposeAll(): void {
    if (this.poseDetector) {
      this.poseDetector.dispose();
      this.poseDetector = null;
    }
    this.cocoModel = null;
    debugLog('[ML] Modelos descarregados');
  }
}

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UseMLModelsOptions {
  models?: ModelType[];
  config?: Partial<MLModelsConfig>;
  autoLoad?: boolean;
  onModelLoaded?: (model: ModelType) => void;
  onError?: (error: Error, model: ModelType) => void;
}

interface UseMLModelsReturn {
  modelsInfo: Map<ModelType, ModelInfo>;
  isLoading: boolean;
  isReady: boolean;
  backend: string;
  loadModel: (model: ModelType) => Promise<boolean>;
  loadAllModels: () => Promise<void>;
  unloadAll: () => void;
  detectObjects: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<DetectedObject[]>;
  detectPoses: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<DetectedPose[]>;
  detectPersons: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<DetectedObject[]>;
  detectVehicles: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<DetectedObject[]>;
  config: MLModelsConfig;
  updateConfig: (updates: Partial<MLModelsConfig>) => void;
}

export function useMLModels(options: UseMLModelsOptions = {}): UseMLModelsReturn {
  const {
    models: requestedModels = ['coco-ssd'],
    config: initialConfig,
    autoLoad = false,
    onModelLoaded,
    onError,
  } = options;

  const [config, setConfig] = useState<MLModelsConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [modelsInfo, setModelsInfo] = useState<Map<ModelType, ModelInfo>>(new Map());
  const [backend, setBackend] = useState<string>('');
  const cache = useRef(ModelCache.getInstance());

  // Atualizar info do modelo
  const updateModelInfo = useCallback((type: ModelType, updates: Partial<ModelInfo>) => {
    setModelsInfo(prev => {
      const next = new Map(prev);
      const current = next.get(type) || {
        type,
        name: type,
        loaded: false,
        loading: false,
        error: null,
      };
      next.set(type, { ...current, ...updates });
      return next;
    });
  }, []);

  // Inicializar backend
  useEffect(() => {
    const init = async () => {
      const activeBackend = await cache.current.initBackend(config.enableGPU);
      setBackend(activeBackend);
    };
    init();
  }, [config.enableGPU]);

  // Carregar modelo COCO-SSD
  const loadCocoSsd = useCallback(async (): Promise<boolean> => {
    updateModelInfo('coco-ssd', { loading: true, error: null });
    const startTime = performance.now();

    try {
      await cache.current.getCocoModel();
      const loadTime = performance.now() - startTime;

      updateModelInfo('coco-ssd', {
        loaded: true,
        loading: false,
        loadTime,
        name: 'COCO-SSD (MobileNet v2)',
      });

      onModelLoaded?.('coco-ssd');
      return true;
    } catch (err: unknown) {
      updateModelInfo('coco-ssd', {
        loading: false,
        error: err.message,
      });
      onError?.(err, 'coco-ssd');
      return false;
    }
  }, [updateModelInfo, onModelLoaded, onError]);

  // Carregar modelo MoveNet
  const loadMoveNet = useCallback(async (): Promise<boolean> => {
    updateModelInfo('movenet', { loading: true, error: null });
    const startTime = performance.now();

    try {
      await cache.current.getPoseDetector();
      const loadTime = performance.now() - startTime;

      updateModelInfo('movenet', {
        loaded: true,
        loading: false,
        loadTime,
        name: 'MoveNet (SinglePose Lightning)',
      });

      onModelLoaded?.('movenet');
      return true;
    } catch (err: unknown) {
      updateModelInfo('movenet', {
        loading: false,
        error: err.message,
      });
      onError?.(err, 'movenet');
      return false;
    }
  }, [updateModelInfo, onModelLoaded, onError]);

  // Carregar modelo por tipo
  const loadModel = useCallback(async (model: ModelType): Promise<boolean> => {
    switch (model) {
      case 'coco-ssd':
        return loadCocoSsd();
      case 'movenet':
        return loadMoveNet();
      default:
        
        return false;
    }
  }, [loadCocoSsd, loadMoveNet]);

  // Carregar todos os modelos
  const loadAllModels = useCallback(async () => {
    for (const model of requestedModels) {
      await loadModel(model);
    }
  }, [requestedModels, loadModel]);

  // Auto-load
  useEffect(() => {
    if (autoLoad && backend) {
      loadAllModels();
    }
  }, [autoLoad, backend, loadAllModels]);

  // Descarregar modelos
  const unloadAll = useCallback(() => {
    cache.current.disposeAll();
    setModelsInfo(new Map());
  }, []);

  // Detectar objetos
  const detectObjects = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectedObject[]> => {
    try {
      const model = await cache.current.getCocoModel();
      const startTime = performance.now();

      const predictions = await model.detect(input, config.maxDetections);
      const inferenceTime = performance.now() - startTime;

      updateModelInfo('coco-ssd', { inferenceTime });

      return predictions
        .filter(p => p.score >= config.minScore)
        .map(p => ({
          class: p.class,
          score: p.score,
          bbox: p.bbox as [number, number, number, number],
        }));
    } catch (err) {
      
      return [];
    }
  }, [config.maxDetections, config.minScore, updateModelInfo]);

  // Detectar poses
  const detectPoses = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectedPose[]> => {
    try {
      const detector = await cache.current.getPoseDetector();
      const startTime = performance.now();

      const poses = await detector.estimatePoses(input);
      const inferenceTime = performance.now() - startTime;

      updateModelInfo('movenet', { inferenceTime });

      return poses.map(pose => ({
        keypoints: pose.keypoints.map(kp => ({
          x: kp.x,
          y: kp.y,
          score: kp.score || 0,
          name: kp.name || '',
        })),
        score: pose.score || 0,
      }));
    } catch (err) {
      
      return [];
    }
  }, [updateModelInfo]);

  // Detectar apenas pessoas
  const detectPersons = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectedObject[]> => {
    const objects = await detectObjects(input);
    return objects.filter(obj => PERSON_CLASSES.includes(obj.class));
  }, [detectObjects]);

  // Detectar apenas veículos
  const detectVehicles = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectedObject[]> => {
    const objects = await detectObjects(input);
    return objects.filter(obj => VEHICLE_CLASSES.includes(obj.class));
  }, [detectObjects]);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<MLModelsConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Estado
  const isLoading = Array.from(modelsInfo.values()).some(m => m.loading);
  const isReady = requestedModels.every(m => modelsInfo.get(m)?.loaded);

  return {
    modelsInfo,
    isLoading,
    isReady,
    backend,
    loadModel,
    loadAllModels,
    unloadAll,
    detectObjects,
    detectPoses,
    detectPersons,
    detectVehicles,
    config,
    updateConfig,
  };
}

// ============================================
// HOOK PARA DETECÇÃO CONTÍNUA
// ============================================

interface UseContinuousDetectionOptions {
  videoElement?: HTMLVideoElement | null;
  enabled?: boolean;
  interval?: number;
  onDetection?: (objects: DetectedObject[], poses: DetectedPose[]) => void;
}

export function useContinuousDetection(options: UseContinuousDetectionOptions) {
  const { videoElement, enabled = false, interval = 500, onDetection } = options;

  const { detectObjects, detectPoses, isReady, loadAllModels } = useMLModels({
    models: ['coco-ssd', 'movenet'],
    autoLoad: enabled,
  });

  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runDetection = useCallback(async () => {
    if (!videoElement || !isReady) return;

    const [objects, poses] = await Promise.all([
      detectObjects(videoElement),
      detectPoses(videoElement),
    ]);

    onDetection?.(objects, poses);
  }, [videoElement, isReady, detectObjects, detectPoses, onDetection]);

  useEffect(() => {
    if (enabled && isReady && videoElement) {
      setIsRunning(true);
      intervalRef.current = setInterval(runDetection, interval);
    } else {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, isReady, videoElement, interval, runDetection]);

  return { isRunning, isReady };
}

export default useMLModels;

