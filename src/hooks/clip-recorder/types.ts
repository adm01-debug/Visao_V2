/**
 * VISÃO - Clip Recorder Types & Constants
 */

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'saving';
export type TriggerType = 'manual' | 'rule' | 'motion' | 'alert' | 'scheduled';

export interface RecordingConfig {
  maxDurationSeconds: number;
  preferredMimeType: string;
  videoBitsPerSecond: number;
  generateThumbnail: boolean;
  autoSave: boolean;
  showPreview: boolean;
}

export interface ClipMetadata {
  cameraId: string;
  cameraName: string;
  triggerType: TriggerType;
  triggerRuleId?: string;
  alertId?: string;
  tags?: string[];
  notes?: string;
}

export interface RecordedClip {
  id?: string;
  blob: Blob;
  url: string;
  thumbnailUrl?: string;
  thumbnailBlob?: Blob;
  startTime: Date;
  endTime: Date;
  duration: number;
  fileSize: number;
  mimeType: string;
  metadata: ClipMetadata;
}

export const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  maxDurationSeconds: 60,
  preferredMimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000,
  generateThumbnail: true,
  autoSave: false,
  showPreview: true,
};

export const SUPPORTED_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];
