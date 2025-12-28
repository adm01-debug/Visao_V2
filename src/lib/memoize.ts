/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: memoize
 * 
 * Memoização inteligente com TTL, LRU cache e WeakMap
 */

export interface MemoizeOptions<T extends (...args: unknown[]) => unknown> {
  maxSize?: number;
  ttl?: number; // ms
  keyGenerator?: (...args: Parameters<T>) => string;
  onHit?: (key: string) => void;
  onMiss?: (key: string) => void;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

/**
 * Memoiza função com cache configurável
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: MemoizeOptions<T> = {}
): T & { cache: Map<string, CacheEntry<ReturnType<T>>>; clear: () => void; stats: () => object } {
  const {
    maxSize = 100,
    ttl,
    keyGenerator = (...args) => JSON.stringify(args),
    onHit,
    onMiss,
  } = options;

  const cache = new Map<string, CacheEntry<ReturnType<T>>>();
  let hits = 0;
  let misses = 0;

  function memoized(this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator(...args);
    const now = Date.now();

    // Verificar cache
    if (cache.has(key)) {
      const entry = cache.get(key)!;
      
      // Verificar TTL
      if (ttl && now - entry.timestamp > ttl) {
        cache.delete(key);
      } else {
        hits++;
        entry.accessCount++;
        onHit?.(key);
        return entry.value;
      }
    }

    // Cache miss
    misses++;
    onMiss?.(key);
    const result = fn.apply(this, args) as ReturnType<T>;

    // Limitar tamanho (LRU eviction)
    if (cache.size >= maxSize) {
      evictLRU();
    }

    cache.set(key, {
      value: result,
      timestamp: now,
      accessCount: 1,
    });

    return result;
  }

  function evictLRU(): void {
    let minAccess = Infinity;
    let oldestKey: string | null = null;

    for (const [key, entry] of cache.entries()) {
      if (entry.accessCount < minAccess) {
        minAccess = entry.accessCount;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  function clear(): void {
    cache.clear();
    hits = 0;
    misses = 0;
  }

  function stats(): object {
    return {
      size: cache.size,
      maxSize,
      hits,
      misses,
      hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
    };
  }

  (memoized as unknown as { cache: typeof cache }).cache = cache;
  (memoized as unknown as { clear: typeof clear }).clear = clear;
  (memoized as unknown as { stats: typeof stats }).stats = stats;

  return memoized as T & { cache: typeof cache; clear: typeof clear; stats: typeof stats };
}

/**
 * Memoiza com WeakMap para objetos
 */
export function memoizeWeak<T extends (obj: object, ...args: unknown[]) => unknown>(
  fn: T
): T {
  const cache = new WeakMap<object, Map<string, unknown>>();

  return function memoized(this: unknown, obj: object, ...args: unknown[]): unknown {
    if (!cache.has(obj)) {
      cache.set(obj, new Map());
    }

    const objCache = cache.get(obj)!;
    const key = JSON.stringify(args);

    if (objCache.has(key)) {
      return objCache.get(key);
    }

    const result = fn.apply(this, [obj, ...args]);
    objCache.set(key, result);
    return result;
  } as T;
}

/**
 * Memoiza função assíncrona
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: MemoizeOptions<T> = {}
): T & { cache: Map<string, CacheEntry<unknown>>; clear: () => void } {
  const {
    maxSize = 100,
    ttl,
    keyGenerator = (...args) => JSON.stringify(args),
  } = options;

  const cache = new Map<string, CacheEntry<unknown>>();
  const pending = new Map<string, Promise<unknown>>();

  async function memoized(this: unknown, ...args: Parameters<T>): Promise<unknown> {
    const key = keyGenerator(...args);
    const now = Date.now();

    // Verificar cache
    if (cache.has(key)) {
      const entry = cache.get(key)!;
      if (!ttl || now - entry.timestamp <= ttl) {
        entry.accessCount++;
        return entry.value;
      }
      cache.delete(key);
    }

    // Verificar se já está em execução
    if (pending.has(key)) {
      return pending.get(key);
    }

    // Executar
    const promise = fn.apply(this, args);
    pending.set(key, promise);

    try {
      const result = await promise;
      
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }

      cache.set(key, { value: result, timestamp: now, accessCount: 1 });
      return result;
    } finally {
      pending.delete(key);
    }
  }

  function clear(): void {
    cache.clear();
    pending.clear();
  }

  (memoized as unknown as { cache: typeof cache }).cache = cache;
  (memoized as unknown as { clear: typeof clear }).clear = clear;

  return memoized as T & { cache: typeof cache; clear: typeof clear };
}

/**
 * Memoiza com cache por argumento
 */
export function memoizeOne<T extends (...args: unknown[]) => unknown>(fn: T): T {
  let lastArgs: Parameters<T> | null = null;
  let lastResult: ReturnType<T>;

  return function memoized(this: unknown, ...args: Parameters<T>): ReturnType<T> {
    if (lastArgs && argsEqual(lastArgs, args)) {
      return lastResult;
    }

    lastArgs = args;
    lastResult = fn.apply(this, args) as ReturnType<T>;
    return lastResult;
  } as T;
}

function argsEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => Object.is(val, b[idx]));
}

export default memoize;
