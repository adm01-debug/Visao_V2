/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Throttle & Debounce Utilities
 * 
 * @module utils/throttle
 */

// ============================================
// TIPOS
// ============================================

type AnyFunction = (...args: never[]) => unknown;

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

interface DebounceOptions {
  leading?: boolean;
  maxWait?: number;
}

interface ThrottledFunction<T extends AnyFunction> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
}

interface DebouncedFunction<T extends AnyFunction> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
  pending: () => boolean;
}

// ============================================
// FUNÇÕES
// ============================================

/**
 * Throttle - Limitar execução a uma vez por intervalo
 * @param fn Função a ser throttled
 * @param limit Intervalo mínimo entre execuções (ms)
 * @param options Opções de configuração
 */
export function throttle<T extends AnyFunction>(
  fn: T,
  limit: number,
  options: ThrottleOptions = {}
): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;
  
  let lastCall = 0;
  let lastResult: ReturnType<T> | undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  const invoke = (args: Parameters<T>): ReturnType<T> => {
    lastCall = Date.now();
    lastResult = fn(...args) as ReturnType<T>;
    return lastResult;
  };
  
  const throttled = (...args: Parameters<T>): ReturnType<T> | undefined => {
    const now = Date.now();
    const remaining = limit - (now - lastCall);
    
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (leading || lastCall !== 0) {
        return invoke(args);
      }
    } else if (!timer && trailing) {
      lastArgs = args;
      timer = setTimeout(() => {
        timer = null;
        if (lastArgs) {
          invoke(lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
    
    return lastResult;
  };
  
  throttled.cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastCall = 0;
    lastArgs = null;
  };
  
  throttled.flush = (): ReturnType<T> | undefined => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      const result = invoke(lastArgs);
      lastArgs = null;
      return result;
    }
    return lastResult;
  };
  
  return throttled;
}

/**
 * Debounce - Executar após período de inatividade
 * @param fn Função a ser debounced
 * @param delay Tempo de espera (ms)
 * @param options Opções de configuração
 */
export function debounce<T extends AnyFunction>(
  fn: T,
  delay: number,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { leading = false, maxWait } = options;
  
  let timer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastResult: ReturnType<T> | undefined;
  let lastCallTime = 0;
  let leadingExecuted = false;
  
  const invoke = (args: Parameters<T>): ReturnType<T> => {
    lastResult = fn(...args) as ReturnType<T>;
    lastCallTime = Date.now();
    leadingExecuted = false;
    return lastResult;
  };
  
  const debounced = (...args: Parameters<T>): ReturnType<T> | undefined => {
    lastArgs = args;
    
    if (leading && !leadingExecuted && !timer) {
      leadingExecuted = true;
      return invoke(args);
    }
    
    if (timer) {
      clearTimeout(timer);
    }
    
    timer = setTimeout(() => {
      timer = null;
      if (maxTimer) {
        clearTimeout(maxTimer);
        maxTimer = null;
      }
      if (lastArgs) {
        invoke(lastArgs);
        lastArgs = null;
      }
    }, delay);
    
    if (maxWait && !maxTimer) {
      maxTimer = setTimeout(() => {
        maxTimer = null;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (lastArgs) {
          invoke(lastArgs);
          lastArgs = null;
        }
      }, maxWait);
    }
    
    return lastResult;
  };
  
  debounced.cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
    }
    lastArgs = null;
    leadingExecuted = false;
  };
  
  debounced.flush = (): ReturnType<T> | undefined => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (maxTimer) {
      clearTimeout(maxTimer);
      maxTimer = null;
    }
    if (lastArgs) {
      const result = invoke(lastArgs);
      lastArgs = null;
      return result;
    }
    return lastResult;
  };
  
  debounced.pending = (): boolean => timer !== null;
  
  return debounced;
}

/**
 * RequestAnimationFrame throttle
 * @param fn Função a ser executada no próximo frame
 */
export function rafThrottle<T extends AnyFunction>(
  fn: T
): ThrottledFunction<T> {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastResult: ReturnType<T> | undefined;
  
  const throttled = (...args: Parameters<T>): ReturnType<T> | undefined => {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs) {
          lastResult = fn(...lastArgs) as ReturnType<T>;
          lastArgs = null;
        }
      });
    }
    
    return lastResult;
  };
  
  throttled.cancel = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastArgs = null;
  };
  
  throttled.flush = (): ReturnType<T> | undefined => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (lastArgs) {
      lastResult = fn(...lastArgs) as ReturnType<T>;
      lastArgs = null;
    }
    return lastResult;
  };
  
  return throttled;
}

export default { throttle, debounce, rafThrottle };
