/**
 * Clipboard utilities
 * Re-exports from @/utils/clipboard for backward compatibility
 */

export {
  copy,
  paste,
  copyToClipboard,
  readFromClipboard,
  copyImage,
  copyRichText,
} from '@/utils/clipboard';

import clipboard from '@/utils/clipboard';
export default clipboard;
