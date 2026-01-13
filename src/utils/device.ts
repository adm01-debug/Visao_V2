/**
 * Device utilities
 * @module utils/device
 */

export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isTablet(): boolean {
  return /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);
}

export function isDesktop(): boolean {
  return !isMobile() && !isTablet();
}

export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (isMobile()) return "mobile";
  if (isTablet()) return "tablet";
  return "desktop";
}

export function getOS(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  if (/Android/i.test(ua)) return "Android";
  if (/iOS/i.test(ua)) return "iOS";
  return "Unknown";
}

export function getScreenSize(): { width: number; height: number } {
  return {
    width: window.screen.width,
    height: window.screen.height,
  };
}

export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function getPixelRatio(): number {
  return window.devicePixelRatio || 1;
}

export function isRetina(): boolean {
  return getPixelRatio() >= 2;
}

export function supportsTouch(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency,
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0
  ];
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    components.push(canvas.toDataURL());
  }
  
  const data = components.join('|');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const device = {
  isMobile,
  isTablet,
  isDesktop,
  getDeviceType,
  getOS,
  getScreenSize,
  getViewportSize,
  getPixelRatio,
  isRetina,
  supportsTouch,
  generateFingerprint,
};

export default device;
