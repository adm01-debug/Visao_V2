/**
 * Object utilities
 * Re-exports from consolidated utils/object module
 * 
 * @module lib/object
 */

import objectUtils from '@/utils/object';

export {
  isObject,
  isEmptyObject,
  pick,
  omit,
  get,
  set,
  merge,
  clone,
  equals,
  keys,
  values,
  entries,
  fromEntries,
  mapValues,
  filterObject,
} from '@/utils/object';

// Legacy isEmpty for backward compatibility
export const isEmpty = (obj: object): boolean => Object.keys(obj).length === 0;

export default {
  pick: objectUtils.pick,
  omit: objectUtils.omit,
  merge: objectUtils.merge,
  clone: objectUtils.clone,
  isEmpty,
};
