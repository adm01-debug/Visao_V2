export interface Camera {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  streamUrl: string;
  thumbnailUrl?: string;
  location?: { lat: number; lng: number };
  zoneId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CameraConfig {
  resolution: '720p' | '1080p' | '4k';
  fps: number;
  codec: 'h264' | 'h265';
  bitrate: number;
}

export type CameraStatus = Camera['status'];
