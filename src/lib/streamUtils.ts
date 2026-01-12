/**
 * Stream Utilities
 * @module lib/streamUtils
 */

export function calculateStreamBandwidth(bitrate: number, cameras: number): number {
  return Math.round(bitrate * cameras / 8);
}

export function estimateRecordingSize(bitrate: number, hours: number): number {
  return Math.round((bitrate * 1000 * hours * 3600) / 8 / 1024 / 1024 / 1024);
}

export function getRecommendedBitrate(resolution: string): number {
  const bitrates: Record<string, number> = {
    '4K': 15000, '1080p': 8000, '720p': 4000, '480p': 2000, '360p': 1000
  };
  return bitrates[resolution] || 4000;
}

export function getRecommendedFramerate(type: 'live' | 'recording'): number {
  return type === 'live' ? 30 : 15;
}

export function calculateLatency(rtt: number, bufferSize: number, frameRate: number): number {
  return Math.round(rtt + (bufferSize / frameRate) * 1000);
}

export function isStreamHealthy(fps: number, expectedFps: number, packetLoss: number): boolean {
  return fps >= expectedFps * 0.8 && packetLoss < 5;
}

export default { calculateStreamBandwidth, estimateRecordingSize, getRecommendedBitrate, getRecommendedFramerate, calculateLatency, isStreamHealthy };
