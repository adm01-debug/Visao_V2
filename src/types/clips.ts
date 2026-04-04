// Clip Types - Projeto VISÃO
// Tipagem forte para gerenciamento de clips de vídeo

export interface Clip {
  id: string;
  cameraId: string;
  cameraName?: string;
  startTime: Date;
  startedAt?: Date;
  endTime: Date;
  duration: number;
  url: string;
  localUrl?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  size: number;
  fileSize?: number;
  format: ClipFormat;
  status: ClipStatus;
  metadata?: ClipMetadata;
  trigger?: RecordingTrigger;
  triggerDetails?: string;
  isFavorite?: boolean;
  isViewed?: boolean;
  frameCount?: number;
  notes?: string;
  tags?: string[];
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

// Compatibility aliases
export type VideoClip = Clip;
export type RecordingTrigger = 'manual' | 'alert' | 'motion' | 'schedule' | 'rule' | 'api';
export type ClipFilters = ClipFilter;

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const formatFileSize = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};
