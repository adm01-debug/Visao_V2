/**
 * Cache Strategies
 */
export type Strategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';
export async function fetchWithStrategy(url: string, strategy: Strategy): Promise<Response> {
  const cache = await caches.open('app-cache');
  if (strategy === 'cache-first') {
    const cached = await cache.match(url);
    if (cached) return cached;
    const response = await fetch(url);
    cache.put(url, response.clone());
    return response;
  }
  if (strategy === 'network-first') {
    try { const response = await fetch(url); cache.put(url, response.clone()); return response; }
    catch { const cached = await cache.match(url); if (cached) return cached; throw new Error('Network and cache failed'); }
  }
  const cached = await cache.match(url);
  const fetchPromise = fetch(url).then(r => { cache.put(url, r.clone()); return r; });
  return cached || await fetchPromise;
}
