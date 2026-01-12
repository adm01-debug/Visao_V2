/**
 * Camera Utilities
 * @module lib/cameraUtils
 */

export interface CameraConfig {
  id: string;
  name: string;
  ip: string;
  port: number;
  protocol: 'rtsp' | 'http' | 'onvif';
  username?: string;
  password?: string;
}

export function buildRTSPUrl(config: CameraConfig): string {
  const auth = config.username ? `${config.username}:${config.password || ''}@` : '';
  return `rtsp://${auth}${config.ip}:${config.port}/stream`;
}

export function buildONVIFUrl(config: CameraConfig): string {
  return `http://${config.ip}:${config.port}/onvif/device_service`;
}

export function buildSnapshotUrl(config: CameraConfig): string {
  return `http://${config.ip}:${config.port}/snapshot.jpg`;
}

export function parseRTSPUrl(url: string): Partial<CameraConfig> {
  const match = url.match(/rtsp:\/\/(?:([^:]+):([^@]+)@)?([^:]+):?(\d+)?\/(.*)/);
  if (!match) return {};
  return {
    username: match[1],
    password: match[2],
    ip: match[3],
    port: parseInt(match[4] || '554'),
    protocol: 'rtsp'
  };
}

export function getCameraStatusColor(status: string): string {
  const colors: Record<string, string> = {
    online: '#22c55e',
    offline: '#ef4444',
    recording: '#3b82f6',
    alert: '#f59e0b',
    maintenance: '#6b7280'
  };
  return colors[status] || '#6b7280';
}

export function estimateStoragePerDay(bitrate: number, hours: number = 24): number {
  return Math.round((bitrate * 1000 * hours * 3600) / 8 / 1024 / 1024 / 1024);
}

export default { buildRTSPUrl, buildONVIFUrl, buildSnapshotUrl, parseRTSPUrl, getCameraStatusColor, estimateStoragePerDay };
