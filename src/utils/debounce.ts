/**
 * Debounce utility
 * Re-exports from throttle module for consistency
 * 
 * @module utils/debounce
 */

import { debounce as _debounce } from './throttle';

export { debounce } from './throttle';
export type { DebouncedFunction, DebounceOptions } from './throttle';

export default _debounce;
