/**
 * Browser detection utilities
 */
export const browser = {
  isChrome: () => /Chrome/.test(navigator.userAgent) && !/Chromium/.test(navigator.userAgent),
  isFirefox: () => /Firefox/.test(navigator.userAgent),
  isSafari: () => /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
  isEdge: () => /Edg/.test(navigator.userAgent),
  isMobile: () => /Android|iPhone|iPad|iPod/.test(navigator.userAgent),
  isIOS: () => /iPhone|iPad|iPod/.test(navigator.userAgent),
  isAndroid: () => /Android/.test(navigator.userAgent),
  isTouchDevice: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  supportsWebGL: () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch { return false; }
  },
  supportsWebRTC: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  getLanguage: () => navigator.language || 'pt-BR',
};

export default browser;
