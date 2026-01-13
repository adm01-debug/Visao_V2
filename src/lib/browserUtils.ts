/**
 * Browser Utilities
 * Re-exports from @/utils/browser for backward compatibility
 */

export {
  isBrowser,
  isServer,
  getBrowserInfo,
  isMobile,
  isOnline,
  getLanguage,
  supportsWebP,
} from '@/utils/browser';

import browser from '@/utils/browser';
export default browser;
