/**
 * File utilities - Re-exports from @/utils/file
 * src/utils/file is the source of truth
 */

export {
  formatFileSize,
  getFileExtension,
  getFileName,
  getFileNameWithoutExtension,
  isImage,
  isVideo,
  isAudio,
  isPDF,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
} from '@/utils/file';

import {
  readFileAsText,
  readFileAsDataURL,
  getFileExtension as _getFileExtension,
  formatFileSize as _formatFileSize,
} from '@/utils/file';

// Legacy aliases for backward compatibility
export const readFile = readFileAsText;

export default {
  readFile: readFileAsText,
  readFileAsDataURL,
  getFileExtension: _getFileExtension,
  formatFileSize: _formatFileSize,
};
