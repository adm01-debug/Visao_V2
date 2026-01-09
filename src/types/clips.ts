// Clip Types - Projeto VISÃO
// Tipagem forte para gerenciamento de clips de vídeo

export interface Clip {
  id: string;
  cameraId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  url: string;
  thumbnailUrl?: string;
  size: number;
  format: ClipFormat;
  status: ClipStatus;
  metadata?: ClipMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type ClipFormat = 'mp4' | 'webm' | 'hls' | 'dash';

export type ClipStatus = 
  | 'recording'
  | 'processing'
  | 'ready'
  | 'error'
  | 'deleted';

export interface ClipMetadata {
  resolution: { width: number; height: number };
  fps: number;
  codec: string;
  bitrate: number;
  hasAudio: boolean;
  alertId?: string;
  tags?: string[];
}

export interface ClipRecordingConfig {
  cameraId: string;
  duration: number;
  preBuffer?: number;
  postBuffer?: number;
  format?: ClipFormat;
  quality?: 'low' | 'medium' | 'high' | 'original';
}

export interface ClipFilter {
  cameraId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ClipStatus;
  minDuration?: number;
  maxDuration?: number;
  tags?: string[];
}

export interface ClipExportOptions {
  format: ClipFormat;
  quality: 'low' | 'medium' | 'high' | 'original';
  includeAudio: boolean;
  watermark?: string;
  startTime?: number;
  endTime?: number;
}

export type ClipEventType = 'start' | 'progress' | 'complete' | 'error';

export interface ClipEvent {
  type: ClipEventType;
  clipId: string;
  progress?: number;
  error?: string;
}
