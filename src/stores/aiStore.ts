/**
 * AI Store - Projeto VISÃO
 * State para análise de IA com tipagem forte
 */
import { create } from "zustand";

export type AIAnalysisType =
  | "face_detection"
  | "face_recognition"
  | "object_detection"
  | "ppe_detection"
  | "plate_recognition"
  | "anomaly_detection"
  | "behavior_analysis";

export interface FaceDetectionResult {
  faces: Array<{
    boundingBox: { x: number; y: number; width: number; height: number };
    landmarks?: Record<string, { x: number; y: number }>;
    expression?: string;
  }>;
}

export interface FaceRecognitionResult {
  matches: Array<{
    personId: string;
    similarity: number;
    name?: string;
  }>;
}

export interface ObjectDetectionResult {
  objects: Array<{
    label: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
}

export interface PPEDetectionResult {
  violations: Array<{
    type: string;
    missing: string[];
    personBoundingBox: { x: number; y: number; width: number; height: number };
  }>;
  compliant: boolean;
}

export interface PlateRecognitionResult {
  plates: Array<{
    text: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
}

export type AIAnalysisResult =
  | FaceDetectionResult
  | FaceRecognitionResult
  | ObjectDetectionResult
  | PPEDetectionResult
  | PlateRecognitionResult
  | Record<string, unknown>;

export interface AIAnalysis {
  id: string;
  type: AIAnalysisType | string;
  result: AIAnalysisResult;
  confidence: number;
  timestamp: Date;
  cameraId?: string;
  processingTime?: number;
}

interface AIState {
  analyses: AIAnalysis[];
  isProcessing: boolean;
  currentModel: string;
  addAnalysis: (analysis: AIAnalysis) => void;
  clearAnalyses: () => void;
  setProcessing: (processing: boolean) => void;
  setModel: (model: string) => void;
}

export const useAIStore = create<AIState>((set) => ({
  analyses: [],
  isProcessing: false,
  currentModel: "gpt-4",
  addAnalysis: (analysis) =>
    set((s) => ({ analyses: [analysis, ...s.analyses].slice(0, 100) })),
  clearAnalyses: () => set({ analyses: [] }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setModel: (currentModel) => set({ currentModel }),
}));

export default useAIStore;

