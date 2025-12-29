/**
 * VISÃO - Sistema de Vigilância Inteligente
 * ML Service - Machine Learning com TensorFlow.js
 * 
 * @module services/mlService
 */

import type { LayersModel, Tensor } from '@tensorflow/tfjs';

// ============================================
// TIPOS
// ============================================

export interface DetectionResult {
  class: string;
  score: number;
  bbox?: [number, number, number, number];
}

export interface FaceDetection {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability?: number[];
  landmarks?: number[][];
}

export interface ModelInfo {
  name: string;
  loaded: boolean;
  type: 'classification' | 'detection' | 'segmentation' | 'custom';
}

// ============================================
// SERVICE
// ============================================

class MLService {
  private models: Map<string, LayersModel> = new Map();
  private modelInfo: Map<string, ModelInfo> = new Map();

  /**
   * Carregar modelo TensorFlow
   */
  async loadModel(name: string, modelUrl: string, type: ModelInfo['type'] = 'custom'): Promise<void> {
    const tf = await import('@tensorflow/tfjs');
    const model = await tf.loadLayersModel(modelUrl);
    this.models.set(name, model);
    this.modelInfo.set(name, { name, loaded: true, type });
  }

  /**
   * Verificar se modelo está carregado
   */
  isModelLoaded(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * Listar modelos carregados
   */
  getLoadedModels(): ModelInfo[] {
    return Array.from(this.modelInfo.values());
  }

  /**
   * Fazer predição com modelo carregado
   */
  async predict(modelName: string, input: number[] | Float32Array): Promise<number[]> {
    const tf = await import('@tensorflow/tfjs');
    const model = this.models.get(modelName);
    
    if (!model) {
      throw new Error(`Model ${modelName} not loaded`);
    }
    
    const tensor = tf.tensor(input);
    const prediction = model.predict(tensor) as Tensor;
    const result = await prediction.array() as number[] | number[][];
    
    // Cleanup
    tensor.dispose();
    prediction.dispose();
    
    return Array.isArray(result[0]) ? (result as number[][]).flat() : result as number[];
  }

  /**
   * Classificar imagem com MobileNet
   */
  async classifyImage(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult[]> {
    const mobilenet = await import('@tensorflow-models/mobilenet');
    const model = await mobilenet.load();
    const predictions = await model.classify(imageElement);
    
    return predictions.map((p) => ({
      class: p.className,
      score: p.probability,
    }));
  }

  /**
   * Detectar objetos com COCO-SSD
   */
  async detectObjects(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult[]> {
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    const model = await cocoSsd.load();
    const predictions = await model.detect(imageElement);
    
    return predictions.map((p) => ({
      class: p.class,
      score: p.score,
      bbox: p.bbox as [number, number, number, number],
    }));
  }

  /**
   * Detectar faces com BlazeFace
   */
  async detectFaces(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult[]> {
    const blazeface = await import('@tensorflow-models/blazeface');
    const model = await blazeface.load();
    const predictions = await model.estimateFaces(imageElement, false);
    
    return predictions.map((p: FaceDetection) => ({
      class: 'face',
      score: p.probability?.[0] ?? 1,
      bbox: [
        p.topLeft[0],
        p.topLeft[1],
        p.bottomRight[0] - p.topLeft[0],
        p.bottomRight[1] - p.topLeft[1],
      ] as [number, number, number, number],
    }));
  }

  /**
   * Detectar poses com PoseNet
   */
  async detectPose(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult[]> {
    const posenet = await import('@tensorflow-models/posenet');
    const net = await posenet.load();
    const pose = await net.estimateSinglePose(imageElement);
    
    return pose.keypoints
      .filter((kp) => kp.score > 0.5)
      .map((kp) => ({
        class: kp.part,
        score: kp.score,
        bbox: [kp.position.x - 5, kp.position.y - 5, 10, 10] as [number, number, number, number],
      }));
  }

  /**
   * Liberar recursos
   */
  dispose(): void {
    this.models.forEach((model) => {
      if (model && typeof model.dispose === 'function') {
        model.dispose();
      }
    });
    this.models.clear();
    this.modelInfo.clear();
  }

  /**
   * Descarregar modelo específico
   */
  unloadModel(name: string): boolean {
    const model = this.models.get(name);
    if (model) {
      if (typeof model.dispose === 'function') {
        model.dispose();
      }
      this.models.delete(name);
      this.modelInfo.delete(name);
      return true;
    }
    return false;
  }
}

export const mlService = new MLService();
export default mlService;
