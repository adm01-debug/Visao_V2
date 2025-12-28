/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: throttle
 * 
 * Throttle avançado com suporte a leading/trailing e cancel
 */

export interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

export interface ThrottledFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
  pending: () => boolean;
}

/**
 * Cria função throttle
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {}
): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;
  
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;
  let result: ReturnType<T> | undefined;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis;
    
    lastArgs = null;
    lastThis = null;
    lastInvokeTime = time;
    result = fn.apply(thisArg, args) as ReturnType<T>;
    return result;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = lastCallTime === undefined ? 0 : time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      timeSinceLastInvoke >= wait
    );
  }

  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timerId = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    lastThis = null;
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = lastCallTime === undefined ? 0 : time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    
    return Math.min(timeWaiting, wait - timeSinceLastInvoke);
  }

  function cancel(): void {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastCallTime = undefined;
    lastThis = null;
    timerId = null;
  }

  function flush(): ReturnType<T> | undefined {
    if (timerId === null) {
      return result;
    }
    return trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timerId !== null;
  }

  function throttled(this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === null) {
        return leadingEdge(lastCallTime);
      }
    }
    if (timerId === null) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }

  throttled.cancel = cancel;
  throttled.flush = flush;
  throttled.pending = pending;

  return throttled;
}

/**
 * Throttle para eventos de scroll
 */
export function throttleScroll<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait = 100
): ThrottledFunction<T> {
  return throttle(fn, wait, { leading: true, trailing: true });
}

/**
 * Throttle para eventos de resize
 */
export function throttleResize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait = 200
): ThrottledFunction<T> {
  return throttle(fn, wait, { leading: false, trailing: true });
}

/**
 * Throttle para requisições de API
 */
export function throttleAPI<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait = 1000
): ThrottledFunction<T> {
  return throttle(fn, wait, { leading: true, trailing: false });
}

/**
 * Throttle com RAF (requestAnimationFrame)
 */
export function throttleRAF<T extends (...args: unknown[]) => void>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(this: unknown, ...args: Parameters<T>): void {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn.apply(this, lastArgs!);
        rafId = null;
      });
    }
  };
}

/**
 * Throttle com limite de chamadas por período
 */
export function throttleRate<T extends (...args: unknown[]) => unknown>(
  fn: T,
  maxCalls: number,
  periodMs: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let calls = 0;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  return function throttled(this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
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

    return fn.apply(this, args) as ReturnType<T>;
  };
}

export default throttle;
