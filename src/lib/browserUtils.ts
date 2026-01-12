/**
 * Browser Utilities
 * @module lib/browserUtils
 */

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isServer(): boolean {
  return typeof window === 'undefined';
}

export function getBrowserInfo(): { name: string; version: string } {
  if (!isBrowser()) return { name: 'unknown', version: 'unknown' };
  
  const ua = navigator.userAgent;
  let name = 'unknown';
  let version = 'unknown';
  
  if (ua.includes('Chrome')) { name = 'Chrome'; version = ua.match(/Chrome\/([\d.]+)/)?.[1] || ''; }
  else if (ua.includes('Firefox')) { name = 'Firefox'; version = ua.match(/Firefox\/([\d.]+)/)?.[1] || ''; }
  else if (ua.includes('Safari')) { name = 'Safari'; version = ua.match(/Version\/([\d.]+)/)?.[1] || ''; }
  else if (ua.includes('Edge')) { name = 'Edge'; version = ua.match(/Edge\/([\d.]+)/)?.[1] || ''; }
  
  return { name, version };
}

export function isMobile(): boolean {
  if (!isBrowser()) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isOnline(): boolean {
  if (!isBrowser()) return true;
  return navigator.onLine;
}

export function getLanguage(): string {
  if (!isBrowser()) return 'en';
  return navigator.language || 'en';
}

export function supportsWebP(): boolean {
  if (!isBrowser()) return false;
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

export default { isBrowser, isServer, getBrowserInfo, isMobile, isOnline, getLanguage, supportsWebP };
