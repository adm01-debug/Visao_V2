// Web Vitals type extension
interface PerformanceEntryWithValue extends PerformanceEntry {
  value?: number;
}

/**
 * Core Web Vitals Tracking
 */
export interface WebVitals { lcp: number; fid: number; cls: number; fcp: number; ttfb: number; }
export function trackWebVitals(callback: (metric: { name: string; value: number }) => void): void {
  if (typeof PerformanceObserver === 'undefined') return;
  new PerformanceObserver(l => l.getEntries().forEach(e => callback({ name: 'LCP', value: e.startTime }))).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => l.getEntries().forEach(e => callback({ name: 'FID', value: (e as PerformanceEntryWithValue).processingStart - e.startTime }))).observe({ type: 'first-input', buffered: true });
  new PerformanceObserver(l => { let cls = 0; l.getEntries().forEach(e => { if (!(e as PerformanceEntryWithValue).hadRecentInput) cls += (e as PerformanceEntryWithValue).value; }); callback({ name: 'CLS', value: cls }); }).observe({ type: 'layout-shift', buffered: true });
}
export function getPerformanceMetrics(): Partial<WebVitals> {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  return { ttfb: nav?.responseStart || 0, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0 };
}
