/**
 * Random utilities - Re-exports from @/utils/random
 * src/utils/random is the source of truth
 */

export {
  randomInt,
  randomFloat,
  randomBoolean,
  randomItem,
  randomItems,
  shuffle,
  randomString,
  randomHex,
  randomAlpha,
  randomNumeric,
  randomColor,
  randomRgb,
  randomHsl,
  randomDate,
  weightedRandom,
  randomGaussian,
} from '@/utils/random';

import {
  randomInt as _randomInt,
  randomFloat as _randomFloat,
  randomItem as _randomItem,
  shuffle as _shuffle,
  randomString as _randomString,
  randomColor as _randomColor,
} from '@/utils/random';

// Legacy alias
export const randomElement = _randomItem;

export default {
  randomInt: _randomInt,
  randomFloat: _randomFloat,
  randomItem: _randomItem,
  shuffle: _shuffle,
  randomString: _randomString,
  randomColor: _randomColor,
};
