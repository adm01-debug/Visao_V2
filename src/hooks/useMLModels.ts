/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useMLModels
 * 
 * Gerenciamento de modelos de Machine Learning:
 * - Carregamento e cache de modelos TensorFlow.js
 * - Detecção de objetos (COCO-SSD)
 * - Detecção de pessoas (MoveNet)
 * - Classificação de ações
 * - Inferência em tempo real
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export type ModelType = 
  | 'coco-ssd'       // Detecção de objetos
  | 'movenet'        // Pose estimation
  | 'blazeface'      // Face detection
  | 'handpose'       // Hand detection
  | 'custom';        // Modelo customizado

export type BackendType = 'webgl' | 'wasm' | 'cpu';

export interface ModelInfo {
  type: ModelType;
  name: string;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadTime?: number;
  inferenceTime?: number;
  size?: number;
}

export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
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

export interface InferenceResult {
  modelType: ModelType;
  objects?: DetectedObject[];
  poses?: DetectedPose[];
  faces?: DetectedObject[];
  custom?: any;
  inferenceTime: number;
  timestamp: Date;
}

export interface MLModelsConfig {
  backend: BackendType;
  maxDetections: number;
  minScore: number;
  warmupRuns: number;
  enableGPU: boolean;
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_CONFIG: MLModelsConfig = {
  backend: 'webgl',
  maxDetections: 20,
  minScore: 0.5,
  warmupRuns: 3,
  enableGPU: true,
};

// Classes de interesse do COCO-SSD
const PERSON_CLASSES = ['person'];
const VEHICLE_CLASSES = ['car', 'motorcycle', 'bus', 'truck', 'bicycle'];
const ANIMAL_CLASSES = ['dog', 'cat', 'bird', 'horse', 'sheep', 'cow'];

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
  backend: BackendType;
  loadModel: (model: ModelType) => Promise<boolean>;
  loadAllModels: () => Promise<void>;
  unloadModel: (model: ModelType) => void;
  detectObjects: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<DetectedObject[]>;
  detectPoses: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<DetectedPose[]>;
  detectPersons: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<DetectedObject[]>;
  detectVehicles: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<DetectedObject[]>;
  runInference: (modelType: ModelType, input: any) => Promise<InferenceResult>;
  warmup: (model: ModelType) => Promise<void>;
  getModelStats: (model: ModelType) => ModelInfo | undefined;
  setBackend: (backend: BackendType) => Promise<void>;
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
  const [backend, setBackendState] = useState<BackendType>(config.backend);

  // Refs para modelos carregados
  const cocoModel = useRef<cocoSsd.ObjectDetection | null>(null);
  const poseModel = useRef<poseDetection.PoseDetector | null>(null);
  const customModels = useRef<Map<string, tf.GraphModel>>(new Map());

  // Inicializar TensorFlow.js
  useEffect(() => {
    const initTF = async () => {
      try {
        // Tentar WebGL primeiro
        if (config.enableGPU) {
          await tf.setBackend('webgl');
        } else {
          await tf.setBackend('cpu');
        }
        await tf.ready();
        setBackendState(tf.getBackend() as BackendType);
        console.log(`[ML] TensorFlow.js inicializado com backend: ${tf.getBackend()}`);
      } catch (err) {
        console.warn('[ML] WebGL não disponível, usando CPU');
        await tf.setBackend('cpu');
        await tf.ready();
        setBackendState('cpu');
      }
    };

    initTF();
  }, [config.enableGPU]);

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

  // Carregar modelo COCO-SSD
  const loadCocoSsd = useCallback(async (): Promise<boolean> => {
    if (cocoModel.current) return true;

    updateModelInfo('coco-ssd', { loading: true, error: null });
    const startTime = performance.now();

    try {
      cocoModel.current = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });

      const loadTime = performance.now() - startTime;
      updateModelInfo('coco-ssd', {
        loaded: true,
        loading: false,
        loadTime,
        name: 'COCO-SSD (MobileNet v2)',
      });

      console.log(`[ML] COCO-SSD carregado em ${loadTime.toFixed(0)}ms`);
      onModelLoaded?.('coco-ssd');
      return true;
    } catch (err: any) {
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
    if (poseModel.current) return true;

    updateModelInfo('movenet', { loading: true, error: null });
    const startTime = performance.now();

    try {
      poseModel.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        }
      );

      const loadTime = performance.now() - startTime;
      updateModelInfo('movenet', {
        loaded: true,
        loading: false,
        loadTime,
        name: 'MoveNet (SinglePose Lightning)',
      });

      console.log(`[ML] MoveNet carregado em ${loadTime.toFixed(0)}ms`);
      onModelLoaded?.('movenet');
      return true;
    } catch (err: any) {
      updateModelInfo('movenet', {
        loading: false,
        error: err.message,
      });
      onError?.(err, 'movenet');
      return false;
    }
  }, [updateModelInfo, onModelLoaded, onError]);

  // Carregar modelo genérico
  const loadModel = useCallback(async (model: ModelType): Promise<boolean> => {
    switch (model) {
      case 'coco-ssd':
        return await loadCocoSsd();
      case 'movenet':
        return await loadMoveNet();
      default:
        console.warn(`[ML] Modelo ${model} não suportado ainda`);
        return false;
    }
  }, [loadCocoSsd, loadMoveNet]);

  // Carregar todos os modelos solicitados
  const loadAllModels = useCallback(async () => {
    for (const model of requestedModels) {
      await loadModel(model);
    }
  }, [requestedModels, loadModel]);

  // Auto-load
  useEffect(() => {
    if (autoLoad) {
      loadAllModels();
    }
  }, [autoLoad, loadAllModels]);

  // Descarregar modelo
  const unloadModel = useCallback((model: ModelType) => {
    switch (model) {
      case 'coco-ssd':
        cocoModel.current = null;
        break;
      case 'movenet':
        poseModel.current?.dispose();
        poseModel.current = null;
        break;
    }
    updateModelInfo(model, { loaded: false, loading: false });
  }, [updateModelInfo]);

  // Detectar objetos com COCO-SSD
  const detectObjects = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectedObject[]> => {
    if (!cocoModel.current) {
      await loadCocoSsd();
    }

    if (!cocoModel.current) {
      return [];
    }

    const startTime = performance.now();

    try {
      const predictions = await cocoModel.current.detect(input, config.maxDetections);
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
      console.error('[ML] Erro na detecção de objetos:', err);
      return [];
    }
  }, [loadCocoSsd, config.maxDetections, config.minScore, updateModelInfo]);

  // Detectar poses com MoveNet
  const detectPoses = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectedPose[]> => {
    if (!poseModel.current) {
      await loadMoveNet();
    }

    if (!poseModel.current) {
      return [];
    }

    const startTime = performance.now();

    try {
      const poses = await poseModel.current.estimatePoses(input);
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
      console.error('[ML] Erro na detecção de poses:', err);
      return [];
    }
  }, [loadMoveNet, updateModelInfo]);

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

  // Rodar inferência genérica
  const runInference = useCallback(async (
    modelType: ModelType,
    input: any
  ): Promise<InferenceResult> => {
    const startTime = performance.now();
    let result: InferenceResult = {
      modelType,
      inferenceTime: 0,
      timestamp: new Date(),
    };

    switch (modelType) {
      case 'coco-ssd':
        result.objects = await detectObjects(input);
        break;
      case 'movenet':
        result.poses = await detectPoses(input);
        break;
    }

    result.inferenceTime = performance.now() - startTime;
    return result;
  }, [detectObjects, detectPoses]);

  // Warmup do modelo
  const warmup = useCallback(async (model: ModelType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 640, 480);
    }

    for (let i = 0; i < config.warmupRuns; i++) {
      await runInference(model, canvas);
    }

    console.log(`[ML] Warmup de ${model} concluído (${config.warmupRuns} runs)`);
  }, [config.warmupRuns, runInference]);

  // Obter estatísticas do modelo
  const getModelStats = useCallback((model: ModelType): ModelInfo | undefined => {
    return modelsInfo.get(model);
  }, [modelsInfo]);

  // Alterar backend
  const setBackend = useCallback(async (newBackend: BackendType) => {
    try {
      await tf.setBackend(newBackend);
      await tf.ready();
      setBackendState(newBackend);

      // Recarregar modelos
      if (cocoModel.current) {
        cocoModel.current = null;
        await loadCocoSsd();
      }
      if (poseModel.current) {
        poseModel.current.dispose();
        poseModel.current = null;
        await loadMoveNet();
      }

      toast.success(`Backend alterado para ${newBackend}`);
    } catch (err: any) {
      toast.error(`Erro ao alterar backend: ${err.message}`);
    }
  }, [loadCocoSsd, loadMoveNet]);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<MLModelsConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Verificar se está pronto
  const isLoading = Array.from(modelsInfo.values()).some(m => m.loading);
  const isReady = requestedModels.every(m => modelsInfo.get(m)?.loaded);

  return {
    modelsInfo,
    isLoading,
    isReady,
    backend,
    loadModel,
    loadAllModels,
    unloadModel,
    detectObjects,
    detectPoses,
    detectPersons,
    detectVehicles,
    runInference,
    warmup,
    getModelStats,
    setBackend,
    config,
    updateConfig,
  };
}

// ============================================
// HOOK PARA ANÁLISE CONTÍNUA
// ============================================

interface UseContinuousDetectionOptions {
  videoElement?: HTMLVideoElement | null;
  enabled?: boolean;
  interval?: number;
  models?: ModelType[];
  onDetection?: (result: InferenceResult) => void;
}

export function useContinuousDetection(options: UseContinuousDetectionOptions) {
  const {
    videoElement,
    enabled = false,
    interval = 500,
    models = ['coco-ssd'],
    onDetection,
  } = options;

  const { detectObjects, detectPoses, isReady, loadAllModels } = useMLModels({
    models,
    autoLoad: enabled,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<InferenceResult | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runDetection = useCallback(async () => {
    if (!videoElement || !isReady) return;

    const startTime = performance.now();
    const result: InferenceResult = {
      modelType: 'coco-ssd',
      inferenceTime: 0,
      timestamp: new Date(),
    };

    if (models.includes('coco-ssd')) {
      result.objects = await detectObjects(videoElement);
    }

    if (models.includes('movenet')) {
      result.poses = await detectPoses(videoElement);
    }

    result.inferenceTime = performance.now() - startTime;
    setLastResult(result);
    onDetection?.(result);
  }, [videoElement, isReady, models, detectObjects, detectPoses, onDetection]);

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

  return {
    isRunning,
    lastResult,
    isReady,
  };
}

export default useMLModels;
