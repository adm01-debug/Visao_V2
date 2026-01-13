/**
 * Device utilities
 * Re-exports from @/utils/device for backward compatibility
 */

export {
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
} from '@/utils/device';

import device from '@/utils/device';
export default device;
