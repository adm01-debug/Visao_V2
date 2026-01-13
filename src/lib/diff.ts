/**
 * Diff utilities - Re-exports from @/utils/diff
 * src/utils/diff is the source of truth
 */

export {
  diffObjects,
  diffObjectsDetailed,
  diffArrays,
  diffArraysBy,
  diffText,
  applyDiff,
  isEqual,
} from '@/utils/diff';

export type {
  ArrayDiff,
  TextDiffEntry,
  ObjectDiffEntry,
} from '@/utils/diff';

import {
  diffObjects as _diffObjects,
  diffArrays as _diffArrays,
  diffText as _diffText,
  isEqual,
  applyDiff as _applyDiff,
} from '@/utils/diff';

// Legacy alias
export const deepEqual = isEqual;

export default {
  diffObjects: _diffObjects,
  diffArrays: _diffArrays,
  diffText: _diffText,
  deepEqual: isEqual,
  applyDiff: _applyDiff,
};
