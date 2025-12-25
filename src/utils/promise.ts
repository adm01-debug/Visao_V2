/**
 * Promise Utilities
 */

export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const timeout = <T>(promise: Promise<T>, ms: number, message = 'Timeout'): Promise<T> =>
  Promise.race([
    promise,
    delay(ms).then(() => Promise.reject(new Error(message)))
  ]);

export const retry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
  backoff = 2
): Promise<T> => {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) await delay(delayMs * (backoff ** i));
    }
  }
  throw lastError;
};

export const debouncePromise = <T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  ms: number
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeoutId: NodeJS.Timeout | undefined;
  let pendingPromise: Promise<ReturnType<T>> | undefined;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, ms);
    });
  };
};

export const allSettled = <T>(promises: Promise<T>[]): Promise<PromiseSettledResult<T>[]> =>
  Promise.allSettled(promises);

export const any = <T>(promises: Promise<T>[]): Promise<T> =>
  Promise.any(promises);

export const sequential = async <T>(fns: (() => Promise<T>)[]): Promise<T[]> => {
  const results: T[] = [];
  for (const fn of fns) {
    results.push(await fn());
  }
  return results;
};

export const parallel = <T>(fns: (() => Promise<T>)[], limit = Infinity): Promise<T[]> => {
  if (limit === Infinity) return Promise.all(fns.map(fn => fn()));
  
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    let running = 0;
    let index = 0;
    let completed = 0;

    const run = async () => {
      while (running < limit && index < fns.length) {
        const i = index++;
        running++;
        try {
          results[i] = await fns[i]();
        } catch (error) {
          return reject(error);
        }
        running--;
        completed++;
        if (completed === fns.length) resolve(results);
        else run();
      }
    };
    run();
  });
};

export const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

export const isPromise = (value: unknown): value is Promise<unknown> =>
  value instanceof Promise || (typeof value === 'object' && value !== null && typeof (value as Promise<unknown>).then === 'function');
