/**
 * Cache Utilities
 * Memory and localStorage caching with TTL
 * @module lib/cacheUtils
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
}

// Memory cache
const memoryCache = new Map<string, CacheItem<unknown>>();

/**
 * Set item in memory cache
 */
export function setMemoryCache<T>(
  key: string,
  value: T,
  ttlMs: number = 5 * 60 * 1000
): void {
  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttlMs,
  });
}

/**
 * Get item from memory cache
 */
export function getMemoryCache<T>(key: string): T | null {
  const item = memoryCache.get(key) as CacheItem<T> | undefined;
  
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  
  return item.value;
}

/**
 * Delete item from memory cache
 */
export function deleteMemoryCache(key: string): boolean {
  return memoryCache.delete(key);
}

/**
 * Clear memory cache
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Get memory cache size
 */
export function getMemoryCacheSize(): number {
  return memoryCache.size;
}

/**
 * Set item in localStorage with TTL
 */
export function setLocalCache<T>(
  key: string,
  value: T,
  ttlMs: number = 24 * 60 * 60 * 1000
): void {
  const item: CacheItem<T> = {
    value,
    expiry: Date.now() + ttlMs,
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch {
    // Quota exceeded, clear old items
    clearExpiredLocalCache();
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch {
      console.warn('localStorage quota exceeded');
    }
  }
}

/**
 * Get item from localStorage
 */
export function getLocalCache<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item: CacheItem<T> = JSON.parse(itemStr);
    
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    
    return item.value;
  } catch {
    return null;
  }
}

/**
 * Delete item from localStorage
 */
export function deleteLocalCache(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clear all expired items from localStorage
 */
export function clearExpiredLocalCache(): number {
  const now = Date.now();
  let cleared = 0;
  
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    try {
      const item = JSON.parse(localStorage.getItem(key) || '');
      if (item.expiry && now > item.expiry) {
        localStorage.removeItem(key);
        cleared++;
      }
    } catch {
      // Not a cache item, skip
    }
  }
  
  return cleared;
}

/**
 * Create a memoized function with cache
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ttlMs: number = 5 * 60 * 1000
): T {
  const cache = new Map<string, CacheItem<ReturnType<T>>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }
    
    const result = fn(...args) as ReturnType<T>;
    cache.set(key, { value: result, expiry: Date.now() + ttlMs });
    
    return result;
  }) as T;
}

/**
 * Create async memoized function
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  ttlMs: number = 5 * 60 * 1000
): T {
  const cache = new Map<string, CacheItem<Awaited<ReturnType<T>>>>();
  const pending = new Map<string, Promise<Awaited<ReturnType<T>>>>();
  
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = JSON.stringify(args);
    
    // Check cache
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }
    
    // Check pending
    if (pending.has(key)) {
      return pending.get(key)!;
    }
    
    // Execute and cache
    const promise = fn(...args) as Promise<Awaited<ReturnType<T>>>;
    pending.set(key, promise);
    
    try {
      const result = await promise;
      cache.set(key, { value: result, expiry: Date.now() + ttlMs });
      return result;
    } finally {
      pending.delete(key);
    }
  }) as T;
}

export default {
  setMemoryCache,
  getMemoryCache,
  deleteMemoryCache,
  clearMemoryCache,
  getMemoryCacheSize,
  setLocalCache,
  getLocalCache,
  deleteLocalCache,
  clearExpiredLocalCache,
  memoize,
  memoizeAsync,
};
