import type Hls from 'hls.js';

export type StreamQuality = 'auto' | 'low' | 'medium' | 'high';
export type StreamStatus =
  'idle' | 'connecting' | 'connected' | 'playing' | 'paused' | 'error' | 'offline';

export interface StreamConnection {
  cameraId: string;
  hlsInstance: Hls | null;
  videoElement: HTMLVideoElement | null;
  status: StreamStatus;
  quality: StreamQuality;
  bitrate: number;
  latency: number;
  buffered: number;
  lastFrame: string | null;
  errorCount: number;
  lastError: string | null;
  connectedAt: Date | null;
}

export interface CameraStreamConfig {
  id: string;
  name: string;
  hlsUrl: string;
  webrtcUrl?: string;
  priority: number;
  enabled: boolean;
}

export interface GlobalStreamingStats {
  totalConnections: number;
  activeConnections: number;
  totalBitrate: number;
  averageLatency: number;
  errorRate: number;
}

export interface GlobalStreamingConfig {
  maxConcurrentStreams: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  bufferLength: number;
  lowLatencyMode: boolean;
  adaptiveBitrate: boolean;
  thumbnailInterval: number;
  priorityBoostVisible: boolean;
}

export const DEFAULT_STREAMING_CONFIG: GlobalStreamingConfig = {
  maxConcurrentStreams: 8,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
  bufferLength: 10,
  lowLatencyMode: true,
  adaptiveBitrate: true,
  thumbnailInterval: 30000,
  priorityBoostVisible: true,
};
