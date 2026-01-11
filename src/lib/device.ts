/**
 * Device utilities
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

export default { isMobile, isTablet, isDesktop, getDeviceType, getOS };

