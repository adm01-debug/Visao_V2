import { DetectedFace, ListType } from '@/components/FaceRecognitionOverlay';

export interface FaceDetectionResult {
  faces: Array<{
    bbox: [number, number, number, number];
    confidence: number;
    landmarks?: unknown;
    attributes?: {
      age?: { min: number; max: number };
      gender?: { value: string; confidence: number };
      emotion?: { dominant: string; confidence: number };
    };
  }>;
  processing_time_ms?: number;
}

export interface UseStreamFaceDetectionOptions {
  cameraId: string;
  detectionIntervalMs?: number;
  autoStart?: boolean;
  onFaceDetected?: (faces: DetectedFace[]) => void;
  onAlert?: (face: DetectedFace) => void;
  minConfidence?: number;
  enableAlertSound?: boolean;
}

export interface FaceDetectionStats {
  totalDetections: number;
  knownFaces: number;
  unknownFaces: number;
  alerts: number;
  avgProcessingTime: number;
}

export interface UseStreamFaceDetectionReturn {
  faces: DetectedFace[];
  isProcessing: boolean;
  isActive: boolean;
  error: string | null;
  stats: FaceDetectionStats;
  start: () => void;
  stop: () => void;
  processFrame: (videoElement: HTMLVideoElement) => Promise<DetectedFace[]>;
  clearFaces: () => void;
}
