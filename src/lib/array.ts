/**
 * Array utilities
 * Re-exports from consolidated utils/array module
 * 
 * @module lib/array
 */

import arrayUtils from '@/utils/array';

export {
  chunk,
  unique,
  uniqueBy,
  groupBy,
  sortBy,
  shuffle,
  first,
  last,
  at,
  compact,
  truthy,
  difference,
  intersection,
  range,
  fill,
  sum,
  average,
  min,
  max,
  countBy,
} from '@/utils/array';

// Legacy flatten function for backward compatibility
export function flatten<T>(arr: (T | T[])[]): T[] {
  return arr.flat() as T[];
}

export default {
  ...arrayUtils,
  flatten,
};
