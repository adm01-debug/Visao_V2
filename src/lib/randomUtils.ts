/**
 * Random Utilities - Re-exports from @/utils/random
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
  randomBoolean as _randomBoolean,
  randomItem,
  shuffle as _shuffle,
  randomColor as _randomColor,
  randomString as _randomString,
} from '@/utils/random';

// Legacy alias
export const randomElement = randomItem;

export default {
  randomInt: _randomInt,
  randomFloat: _randomFloat,
  randomBoolean: _randomBoolean,
  randomElement: randomItem,
  shuffle: _shuffle,
  randomColor: _randomColor,
  randomString: _randomString,
};
