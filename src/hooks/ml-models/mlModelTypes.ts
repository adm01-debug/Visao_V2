/**
 * VISÃO - ML Models Types & Constants
 */

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

export const DEFAULT_CONFIG: MLModelsConfig = {
  backend: 'webgl',
  maxDetections: 20,
  minScore: 0.5,
  warmupRuns: 1,
  enableGPU: true,
};

export const PERSON_CLASSES = ['person'];
export const VEHICLE_CLASSES = ['car', 'motorcycle', 'bus', 'truck', 'bicycle'];
