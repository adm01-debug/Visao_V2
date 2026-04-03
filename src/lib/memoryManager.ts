// Type declaration for performance.memory (Chrome-only API)
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
  interface Window {
    gc?: () => void;
  }
}

/**
 * Memory Manager
 */
export function getMemoryInfo(): { used: number; total: number; limit: number } | null {
  const mem = performance.memory;
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
export function forceGC(): void { if (window.gc) window.gc(); }
