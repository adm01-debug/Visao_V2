/**
 * Browser detection utilities
 * Re-exports from @/utils/browser for backward compatibility
 */

export {
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
  browser,
} from '@/utils/browser';

import { browser } from '@/utils/browser';
export default browser;
