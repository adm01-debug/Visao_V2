/**
 * Browser detection utilities
 * @module utils/browser
 */

export function isChrome(): boolean {
  return /Chrome/.test(navigator.userAgent) && !/Chromium/.test(navigator.userAgent);
}

export function isFirefox(): boolean {
  return /Firefox/.test(navigator.userAgent);
}

export function isSafari(): boolean {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
}

export function isEdge(): boolean {
  return /Edg/.test(navigator.userAgent);
}

export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function supportsWebRTC(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export function getLanguage(): string {
  return navigator.language || 'pt-BR';
}

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

export function isOnline(): boolean {
  if (!isBrowser()) return true;
  return navigator.onLine;
}

export function supportsWebP(): boolean {
  if (!isBrowser()) return false;
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

export const browser = {
  isChrome,
  isFirefox,
  isSafari,
  isEdge,
  isMobile,
  isIOS,
  isAndroid,
  isTouchDevice,
  supportsWebGL,
  supportsWebRTC,
  getLanguage,
  isBrowser,
  isServer,
  getBrowserInfo,
  isOnline,
  supportsWebP,
};

export default browser;
