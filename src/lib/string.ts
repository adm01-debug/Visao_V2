/**
 * String utilities
 * Re-exports from consolidated utils/string module
 * 
 * @module lib/string
 */

import * as stringUtils from '@/utils/string';

export {
  capitalize,
  capitalizeWords,
  camelCase,
  pascalCase,
  kebabCase,
  snakeCase,
  truncate,
  truncateWords,
  slugify,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  reverse,
  isPalindrome,
  countWords,
  countChars,
  padStart,
  padEnd,
  padCenter,
  removeAccents,
  mask,
  isBlank,
  isEmpty,
  wordWrap,
} from '@/utils/string';

// Legacy template function for backward compatibility
export function template(str: string, data: Record<string, unknown>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] || ""));
}

export default { 
  ...stringUtils, 
  template 
};
