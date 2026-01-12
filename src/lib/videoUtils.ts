/**
 * Video Utilities
 * @module lib/videoUtils
 */

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return \`\${h}:\${String(m).padStart(2, '0')}:\${String(s).padStart(2, '0')}\`;
  return \`\${m}:\${String(s).padStart(2, '0')}\`;
}

export function parseTimecode(timecode: string): number {
  const parts = timecode.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function calculateBitrate(fileSize: number, duration: number): number {
  return Math.round((fileSize * 8) / duration / 1000);
}

export function estimateFileSize(bitrate: number, duration: number): number {
  return Math.round((bitrate * 1000 * duration) / 8);
}

export function getVideoResolution(width: number, height: number): string {
  if (width >= 3840) return '4K';
  if (width >= 1920) return '1080p';
  if (width >= 1280) return '720p';
  if (width >= 854) return '480p';
  return \`\${width}x\${height}\`;
}

export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return \`\${width / divisor}:\${height / divisor}\`;
}

export default { formatDuration, parseTimecode, calculateBitrate, estimateFileSize, getVideoResolution, calculateAspectRatio };
