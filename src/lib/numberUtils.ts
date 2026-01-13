/**
 * Number Utilities - Re-exports from @/utils/number and @/utils/math
 * src/utils is the source of truth
 */

export {
  isNumber,
  isInteger,
  isPositive,
  isNegative,
  isZero,
  isEven,
  isOdd,
  toNumber,
  parseNumber,
  formatNumber,
  formatCompact,
  formatOrdinal,
  padZero,
  randomInt,
  randomFloat,
  inRange,
  toPercentage,
  fromPercentage,
  abbreviate,
} from '@/utils/number';

export {
  clamp,
  round,
  sum,
  average,
  min,
  max,
  percentage,
} from '@/utils/math';

import {
  clamp as _clamp,
  round as _round,
  sum as _sum,
  average as _average,
  min as _min,
  max as _max,
  percentage as _percentage,
} from '@/utils/math';

import {
  isEven as _isEven,
  isOdd as _isOdd,
  inRange as _inRange,
} from '@/utils/number';

export default {
  clamp: _clamp,
  round: _round,
  percentage: _percentage,
  average: _average,
  sum: _sum,
  min: _min,
  max: _max,
  isEven: _isEven,
  isOdd: _isOdd,
  inRange: _inRange,
};
