/**
 * VISÃO - InsightFace client types.
 */

export type InsightFaceModel =
  | 'arcface_r100_v1'
  | 'arcface_glintr100'
  | 'face-api-128';

export interface InsightFaceBBox {
  bbox: [number, number, number, number]; // x1, y1, x2, y2
  score: number;
  landmarks: Array<[number, number]>;
}

export interface InsightFaceDetectResult {
  faces: InsightFaceBBox[];
  model_version: string;
}

export interface ArcFaceEmbedding {
  embedding: number[];
  dim: 512;
  model_version: InsightFaceModel;
  norm: number;
  source_hash?: string;
}

export interface LivenessResult {
  is_live: boolean;
  score: number;
  threshold: number;
  model_version: string;
}

export interface FaceAnalysis {
  age?: number;
  gender?: 'male' | 'female' | 'unknown';
  emotion?: string;
  pose?: { yaw: number; pitch: number; roll: number };
  model_version: string;
}

export interface MigrationBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  errors: Array<{ person_id: string; message: string }>;
}

export interface InsightFaceError {
  error: string;
  status: number;
  details: string;
}
