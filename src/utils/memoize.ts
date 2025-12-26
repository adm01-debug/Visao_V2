/**
 * Memoize Utility
 */
export function memoize<T extends (...args: any[]) => any>(fn: T, options?: { maxSize?: number; ttl?: number }): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  const { maxSize = 100, ttl = 0 } = options || {};
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached && (!ttl || Date.now() - cached.timestamp < ttl)) return cached.value;
    const result = fn(...args);
    if (cache.size >= maxSize) cache.delete(cache.keys().next().value);
    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  }) as T;
}
