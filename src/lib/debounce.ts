/**
 * Debounce & Throttle utilities
 * Re-exports from consolidated utils/throttle module
 * 
 * @module lib/debounce
 */

import { 
  debounce as _debounce, 
  throttle as _throttle, 
  rafThrottle 
} from '@/utils/throttle';

export { debounce, throttle, rafThrottle } from '@/utils/throttle';

export type { 
  AnyFunction, 
  ThrottleOptions, 
  DebounceOptions, 
  ThrottledFunction, 
  DebouncedFunction 
} from '@/utils/throttle';

export default { debounce: _debounce, throttle: _throttle, rafThrottle };
