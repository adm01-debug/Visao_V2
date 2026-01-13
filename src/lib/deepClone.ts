/**
 * Deep clone utilities - Re-exports from @/utils/deep
 * src/utils/deep is the source of truth
 */

export {
  deepClone,
  deepMerge,
  deepEqual,
  deepGet,
  deepSet,
  deepUnset,
  deepHas,
  deepFlatten,
} from '@/utils/deep';

import { deepClone as _deepClone, deepMerge as _deepMerge } from '@/utils/deep';

export default { deepClone: _deepClone, deepMerge: _deepMerge };
