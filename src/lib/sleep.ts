/**
 * Sleep Utility - Re-exports from @/utils/promise
 * src/utils/promise is the source of truth
 */

export { sleep, sleepUntil, delay, wait } from '@/utils/promise';

import { sleep as _sleep, sleepUntil as _sleepUntil } from '@/utils/promise';

export default { sleep: _sleep, sleepUntil: _sleepUntil, delay: _sleep, wait: _sleep };
