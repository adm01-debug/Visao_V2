/**
 * Throttle utilities
 * Re-exports from consolidated utils/throttle module
 * 
 * @module lib/throttle
 */

import { 
  throttle as _throttle, 
  debounce, 
  rafThrottle,
  type AnyFunction,
  type ThrottledFunction 
} from '@/utils/throttle';

export { throttle, debounce, rafThrottle } from '@/utils/throttle';

export type { 
  AnyFunction, 
  ThrottleOptions, 
  DebounceOptions, 
  ThrottledFunction, 
  DebouncedFunction 
} from '@/utils/throttle';

// Additional throttle utilities
export function throttleScroll<T extends AnyFunction>(
  fn: T,
  wait = 100
): ThrottledFunction<T> {
  return _throttle(fn, wait, { leading: true, trailing: true });
}

export function throttleResize<T extends AnyFunction>(
  fn: T,
  wait = 200
): ThrottledFunction<T> {
  return _throttle(fn, wait, { leading: false, trailing: true });
}

export function throttleAPI<T extends AnyFunction>(
  fn: T,
  wait = 1000
): ThrottledFunction<T> {
  return _throttle(fn, wait, { leading: true, trailing: false });
}

export function throttleRAF<T extends (...args: unknown[]) => void>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(...args: Parameters<T>): void {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn(...lastArgs!);
        rafId = null;
      });
    }
  };
}

export function throttleRate<T extends (...args: unknown[]) => unknown>(
  fn: T,
  maxCalls: number,
  periodMs: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let calls = 0;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  return function throttled(...args: Parameters<T>): ReturnType<T> | undefined {
    if (calls >= maxCalls) {
      return undefined;
    }

    calls++;
    
    if (resetTimer === null) {
      resetTimer = setTimeout(() => {
        calls = 0;
        resetTimer = null;
      }, periodMs);
    }

    return fn(...args) as ReturnType<T>;
  };
}

export default { throttle: _throttle, debounce, rafThrottle };
