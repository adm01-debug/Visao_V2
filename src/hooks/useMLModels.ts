/**
 * VISÃO - Hook: useMLModels (Refactored)
 * Gerenciamento de modelos TensorFlow.js
 * TF and COCO-SSD are loaded lazily to reduce initial bundle.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
// pose-detection loaded lazily to avoid @mediapipe/pose ESM crash
type PoseDetectionModule = typeof import('@tensorflow-models/pose-detection');
let _poseDetection: PoseDetectionModule | null = null;
async function getPoseDetectionModule(): Promise<PoseDetectionModule> {
  if (!_poseDetection) {
    _poseDetection = await import('@tensorflow-models/pose-detection');
  }
  return _poseDetection;
}

// Lazy TF loader
type TfModule = typeof import('@tensorflow/tfjs');
let _tf: TfModule | null = null;
async function getTf(): Promise<TfModule> {
  if (!_tf) {
    _tf = await import('@tensorflow/tfjs');
  }
  return _tf;
}

// Lazy COCO-SSD loader
type CocoSsdModule = typeof import('@tensorflow-models/coco-ssd');
let _cocoSsd: CocoSsdModule | null = null;
async function getCocoSsd(): Promise<CocoSsdModule> {
  if (!_cocoSsd) {
    _cocoSsd = await import('@tensorflow-models/coco-ssd');
  }
  return _cocoSsd;
}

import {
  type ModelType,
  type ModelInfo,
  type DetectedObject,
  type DetectedPose,
  type MLModelsConfig,
  DEFAULT_CONFIG,
  PERSON_CLASSES,
  VEHICLE_CLASSES,
} from './ml-models/mlModelTypes';

export type { ModelType, ModelInfo, DetectedObject, DetectedPose, MLModelsConfig };
export type { BackendType, PoseKeypoint } from './ml-models/mlModelTypes';

// Debug log condicional
const debugLog = (_message: string, ..._args: unknown[]) => {
  if (import.meta.env.DEV) {
    /* noop */
  }
};

// Singleton para cache de modelos
// Variáveis estáticas sobrevivem a reloads de módulo e Strict Mode double-mount
class ModelCache {
  private static instance: ModelCache | null = null;
  // Estáticas: persistem entre instâncias e survives double-mount
  private static backendReady = false;
  private static backendInitialized = false;
  private static cocoLoadFailed = false;
  private static poseLoadFailed = false;
  private static lastBackend = '';
  // Instância: referências de modelo por instância
  private cocoModel: Awaited<ReturnType<CocoSsdModule['load']>> | null = null;
  private poseDetector: Awaited<ReturnType<PoseDetectionModule['createDetector']>> | null = null;

  static getInstance(): ModelCache {
    if (!ModelCache.instance) ModelCache.instance = new ModelCache();
    return ModelCache.instance;
  }

  async initBackend(preferGPU: boolean): Promise<string> {
    if (ModelCache.backendInitialized) return ModelCache.lastBackend;
    const tf = await getTf();
    try {
      if (preferGPU) {
        await tf.setBackend('webgl');
        await tf.ready();
        ModelCache.backendReady = true;
        ModelCache.backendInitialized = true;
        ModelCache.lastBackend = 'webgl';
        return 'webgl';
      }
    } catch {
      /* fallthrough */
    }
    try {
      await tf.setBackend('wasm');
      await tf.ready();
      ModelCache.backendReady = true;
      ModelCache.backendInitialized = true;
      ModelCache.lastBackend = 'wasm';
      return 'wasm';
    } catch {
      /* fallthrough */
    }
    await tf.setBackend('cpu');
    await tf.ready();
    ModelCache.backendReady = true;
    ModelCache.backendInitialized = true;
    ModelCache.lastBackend = 'cpu';
    return 'cpu';
  }

  hasCocoFailed(): boolean {
    return ModelCache.cocoLoadFailed;
  }
  hasPoseFailed(): boolean {
    return ModelCache.poseLoadFailed;
  }

  async getCocoModel() {
    if (this.cocoModel) return this.cocoModel;
    if (ModelCache.cocoLoadFailed) {
      throw new Error('CO-SSD indisponível (CSP ou rede) — falha já registrada nesta sessão');
    }
    try {
      debugLog('[ML] Loading COCO-SSD...');
      const cocoSsd = await getCocoSsd();
      this.cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      return this.cocoModel;
    } catch (err) {
      ModelCache.cocoLoadFailed = true;
      throw err;
    }
  }

  async getPoseDetector() {
    if (this.poseDetector) return this.poseDetector;
    if (ModelCache.poseLoadFailed) {
      throw new Error('MoveNet indisponível (CSP ou rede) — falha já registrada nesta sessão');
    }
    try {
      debugLog('[ML] Loading MoveNet...');
      const pd = await getPoseDetectionModule();
      this.poseDetector = await pd.createDetector(pd.SupportedModels.MoveNet, {
        modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      });
      return this.poseDetector;
    } catch (err) {
      ModelCache.poseLoadFailed = true;
      throw err;
    }
  }

  disposeAll(): void {
    if (this.poseDetector) {
      this.poseDetector.dispose();
      this.poseDetector = null;
    }
    this.cocoModel = null;
  }
}

// Hook principal
export interface UseMLModelsReturn {
  modelsInfo: Map<ModelType, ModelInfo>;
  isLoading: boolean;
  isReady: boolean;
  isModelLoaded: boolean;
  backend: string;
  loadModel: (model: ModelType) => Promise<boolean>;
  loadAllModels: () => Promise<void>;
  unloadAll: () => void;
  detectObjects: (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ) => Promise<DetectedObject[]>;
  detectedObjects: DetectedObject[];
  detectPoses: (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ) => Promise<DetectedPose[]>;
  detectPersons: (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ) => Promise<DetectedObject[]>;
  detectVehicles: (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ) => Promise<DetectedObject[]>;
  config: MLModelsConfig;
  updateConfig: (updates: Partial<MLModelsConfig>) => void;
  error: string | null;
}

interface UseMLModelsOptions {
  models?: ModelType[];
  config?: Partial<MLModelsConfig>;
  autoLoad?: boolean;
  onModelLoaded?: (model: ModelType) => void;
  onError?: (error: Error, model: ModelType) => void;
}

export function useMLModels(options: UseMLModelsOptions = {}): UseMLModelsReturn {
  const {
    models: requestedModels = ['coco-ssd'],
    config: initialConfig,
    autoLoad = false,
    onModelLoaded,
    onError,
  } = options;
  const [config, setConfig] = useState<MLModelsConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [modelsInfo, setModelsInfo] = useState<Map<ModelType, ModelInfo>>(new Map());
  const [backend, setBackend] = useState<string>('');
  const cache = useRef(ModelCache.getInstance());

  const updateModelInfo = useCallback((type: ModelType, updates: Partial<ModelInfo>) => {
    setModelsInfo((prev) => {
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

  useEffect(() => {
    if (ModelCache.backendInitialized) return;
    const init = async () => {
      const b = await cache.current.initBackend(config.enableGPU);
      setBackend(b);
    };
    void init();
  }, [config.enableGPU]); // sem dependência em cache.current — é singleton

  const loadCocoSsd = useCallback(async (): Promise<boolean> => {
    updateModelInfo('coco-ssd', { loading: true, error: null });
    const startTime = performance.now();
    try {
      await cache.current.getCocoModel();
      updateModelInfo('coco-ssd', {
        loaded: true,
        loading: false,
        loadTime: performance.now() - startTime,
        name: 'COCO-SSD (MobileNet v2)',
      });
      onModelLoaded?.('coco-ssd');
      return true;
    } catch (err: unknown) {
      updateModelInfo('coco-ssd', { loading: false, error: (err as Error).message });
      onError?.(err as Error, 'coco-ssd');
      return false;
    }
  }, [updateModelInfo, onModelLoaded, onError]);

  const loadMoveNet = useCallback(async (): Promise<boolean> => {
    updateModelInfo('movenet', { loading: true, error: null });
    const startTime = performance.now();
    try {
      await cache.current.getPoseDetector();
      updateModelInfo('movenet', {
        loaded: true,
        loading: false,
        loadTime: performance.now() - startTime,
        name: 'MoveNet (SinglePose Lightning)',
      });
      onModelLoaded?.('movenet');
      return true;
    } catch (err: unknown) {
      updateModelInfo('movenet', { loading: false, error: (err as Error).message });
      onError?.(err as Error, 'movenet');
      return false;
    }
  }, [updateModelInfo, onModelLoaded, onError]);

  const loadModel = useCallback(
    async (model: ModelType): Promise<boolean> => {
      switch (model) {
        case 'coco-ssd':
          return loadCocoSsd();
        case 'movenet':
          return loadMoveNet();
        default:
          return false;
      }
    },
    [loadCocoSsd, loadMoveNet]
  );

  const loadAllModels = useCallback(async () => {
    for (const model of requestedModels) await loadModel(model);
  }, [requestedModels, loadModel]);

  useEffect(() => {
    if (!autoLoad || !backend) return;
    // Se já houve falha de CSP, não retentar — evita loop infinito
    const c = cache.current;
    if (c.hasCocoFailed() && requestedModels.includes('coco-ssd')) return;
    if (c.hasPoseFailed() && requestedModels.includes('movenet')) return;
    void loadAllModels();
  }, [autoLoad, backend, loadAllModels]);

  const unloadAll = useCallback(() => {
    cache.current.disposeAll();
    setModelsInfo(new Map());
  }, []);

  const detectObjects = useCallback(
    async (
      input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): Promise<DetectedObject[]> => {
      try {
        const model = await cache.current.getCocoModel();
        const startTime = performance.now();
        const predictions = await model.detect(input, config.maxDetections);
        updateModelInfo('coco-ssd', { inferenceTime: performance.now() - startTime });
        return predictions
          .filter((p) => p.score >= config.minScore)
          .map((p) => ({
            class: p.class,
            score: p.score,
            bbox: p.bbox as [number, number, number, number],
          }));
      } catch {
        return [];
      }
    },
    [config.maxDetections, config.minScore, updateModelInfo]
  );

  const detectPoses = useCallback(
    async (
      input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): Promise<DetectedPose[]> => {
      try {
        const detector = await cache.current.getPoseDetector();
        const startTime = performance.now();
        const poses = await detector.estimatePoses(input);
        updateModelInfo('movenet', { inferenceTime: performance.now() - startTime });
        return poses.map(
          (pose: {
            keypoints: Array<{ x: number; y: number; score?: number; name?: string }>;
            score?: number;
          }) => ({
            keypoints: pose.keypoints.map(
              (kp: { x: number; y: number; score?: number; name?: string }) => ({
                x: kp.x,
                y: kp.y,
                score: kp.score || 0,
                name: kp.name || '',
              })
            ),
            score: pose.score || 0,
          })
        );
      } catch {
        return [];
      }
    },
    [updateModelInfo]
  );

  const detectPersons = useCallback(
    async (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => {
      return (await detectObjects(input)).filter((obj) => PERSON_CLASSES.includes(obj.class));
    },
    [detectObjects]
  );

  const detectVehicles = useCallback(
    async (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => {
      return (await detectObjects(input)).filter((obj) => VEHICLE_CLASSES.includes(obj.class));
    },
    [detectObjects]
  );

  const updateConfig = useCallback(
    (updates: Partial<MLModelsConfig>) => setConfig((prev) => ({ ...prev, ...updates })),
    []
  );
  const isLoading = Array.from(modelsInfo.values()).some((m) => m.loading);
  const isReady = requestedModels.every((m) => modelsInfo.get(m)?.loaded);

  return {
    modelsInfo,
    isLoading,
    isReady,
    isModelLoaded: isReady,
    backend,
    loadModel,
    loadAllModels,
    unloadAll,
    detectObjects,
    detectedObjects: [] as DetectedObject[],
    detectPoses,
    detectPersons,
    detectVehicles,
    config,
    updateConfig,
    error: null as string | null,
  };
}

// Hook para detecção contínua
interface UseContinuousDetectionOptions {
  videoElement?: HTMLVideoElement | null;
  enabled?: boolean;
  interval?: number;
  onDetection?: (objects: DetectedObject[], poses: DetectedPose[]) => void;
}

export function useContinuousDetection(options: UseContinuousDetectionOptions) {
  const { videoElement, enabled = false, interval = 500, onDetection } = options;
  // autoLoad: false — deixa que usePPEDetection / useMLModels da página carregue.
  // Aqui apenas consumimos os modelos já carregados; detectObjects/Poses lidam com
  // modelo ainda não disponível.
  const { detectObjects, detectPoses, isReady } = useMLModels({
    models: ['coco-ssd', 'movenet'],
    autoLoad: false,
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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, isReady, videoElement, interval, runDetection]);

  return { isRunning, isReady };
}

export default useMLModels;
