import type { StreamConfig, StreamQuality, StreamStatus } from '@/types/streaming';
import type { AnalysisType, AnalysisResult, AnalysisAlert } from '@/hooks/useImageAnalysis';
import type { DbRule } from '@/types/rules';

export interface Detection {
  id: string;
  type: 'person' | 'vehicle' | 'object' | 'zone';
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface VideoStreamPlayerProps {
  cameraId: string;
  cameraName: string;
  location?: string;
  streamUrl?: string;
  protocol?: StreamConfig['protocol'];
  isLive?: boolean;
  detections?: Detection[];
  showStats?: boolean;
  enableFaceDetection?: boolean;
  faceDetectionInterval?: number;
  height?: number | string;
  onSnapshot?: (imageData: string) => void;
  onError?: (error: string) => void;
  onClick?: () => void;
  className?: string;
  enableContinuousAnalysis?: boolean;
  analysisType?: AnalysisType;
  analysisIntervalMs?: number;
  analysisRules?: DbRule[];
  saveAnalysisHistory?: boolean;
  onAnalysisAlert?: (alert: AnalysisAlert, result: AnalysisResult) => void;
  onAnalysisResult?: (result: AnalysisResult) => void;
}
