/**
 * Render Optimizer
 */
export function batchUpdates<T>(updates: (() => T)[]): T[] {
  const results: T[] = [];
  requestAnimationFrame(() => updates.forEach(u => results.push(u())));
  return results;
}
export function deferRender(callback: () => void): void {
  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(callback);
  else setTimeout(callback, 1);
}
export function measureRender(name: string, callback: () => void): number {
  const start = performance.now();
  callback();
  const duration = performance.now() - start;
  }ms`);
  return duration;
}
