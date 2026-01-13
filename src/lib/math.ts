/**
 * Math utilities - Re-exports from @/utils/math
 * src/utils/math is the source of truth
 */

export {
  clamp,
  lerp,
  inverseLerp,
  remap,
  round,
  floor,
  ceil,
  sum,
  average,
  median,
  standardDeviation,
  min,
  max,
  percentage,
  degToRad,
  radToDeg,
  distance,
  isPowerOfTwo,
  factorial,
  gcd,
  lcm,
} from '@/utils/math';

import {
  clamp as _clamp,
  lerp as _lerp,
  sum as _sum,
  average as _average,
  min as _min,
  max as _max,
  degToRad as _degToRad,
  radToDeg as _radToDeg,
} from '@/utils/math';

export default {
  sum: _sum,
  average: _average,
  min: _min,
  max: _max,
  clamp: _clamp,
  lerp: _lerp,
  degToRad: _degToRad,
  radToDeg: _radToDeg,
};
