/**
 * Memory Manager
 */
export function getMemoryInfo(): { used: number; total: number; limit: number } | null {
  const mem = (performance as any).memory;
  if (!mem) return null;
  return { used: mem.usedJSHeapSize, total: mem.totalJSHeapSize, limit: mem.jsHeapSizeLimit };
}
export function scheduleCleanup(callback: () => void, threshold = 0.8): () => void {
  const interval = setInterval(() => {
    const mem = getMemoryInfo();
    if (mem && mem.used / mem.limit > threshold) callback();
  }, 30000);
  return () => clearInterval(interval);
}
export function forceGC(): void { if ((window as any).gc) (window as any).gc(); }
