/**
 * Crash Reporting Utilities
 * Track and report application crashes
 * @module lib/crashReporting
 */

interface CrashReport {
  type: 'crash' | 'freeze' | 'oom';
  timestamp: string;
  url: string;
  sessionDuration: number;
  memoryUsage?: number;
  performanceMetrics?: Record<string, number>;
  lastActions: string[];
}

const sessionStart = Date.now();
const lastActions: string[] = [];
const MAX_ACTIONS = 50;

/**
 * Track user action
 */
export function trackAction(action: string): void {
  lastActions.push(`${Date.now()}: ${action}`);
  if (lastActions.length > MAX_ACTIONS) {
    lastActions.shift();
  }
}

/**
 * Get memory usage if available
 */
function getMemoryUsage(): number | undefined {
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
  return perf.memory?.usedJSHeapSize;
}

/**
 * Get performance metrics
 */
function getPerformanceMetrics(): Record<string, number> {
  if (typeof performance === 'undefined') return {};
  
  const entries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!entries) return {};
  
  return {
    domLoad: entries.domContentLoadedEventEnd - entries.startTime,
    pageLoad: entries.loadEventEnd - entries.startTime,
    dns: entries.domainLookupEnd - entries.domainLookupStart,
    tcp: entries.connectEnd - entries.connectStart,
    ttfb: entries.responseStart - entries.requestStart,
  };
}

/**
 * Create crash report
 */
function createCrashReport(type: CrashReport['type']): CrashReport {
  return {
    type,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    sessionDuration: Date.now() - sessionStart,
    memoryUsage: getMemoryUsage(),
    performanceMetrics: getPerformanceMetrics(),
    lastActions: [...lastActions],
  };
}

/**
 * Send crash report
 */
async function sendCrashReport(report: CrashReport): Promise<void> {
  const endpoint = import.meta.env.VITE_CRASH_REPORTING_ENDPOINT as string | undefined;
  if (!endpoint) return;

  const data = JSON.stringify(report);
  
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, data);
  } else {
    try {
      await fetch(endpoint, {
        method: 'POST',
        body: data,
        keepalive: true,
      });
    } catch {
      // Silent fail during crash
    }
  }
}

/**
 * Report crash
 */
export function reportCrash(): void {
  const report = createCrashReport('crash');
  sendCrashReport(report);
}

/**
 * Report freeze
 */
export function reportFreeze(): void {
  const report = createCrashReport('freeze');
  sendCrashReport(report);
}

/**
 * Report out of memory
 */
export function reportOOM(): void {
  const report = createCrashReport('oom');
  sendCrashReport(report);
}

/**
 * Detect and report page freeze
 */
export function setupFreezeDetection(thresholdMs: number = 5000): () => void {
  let lastCheck = Date.now();
  
  const intervalId = setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastCheck;
    
    if (elapsed > thresholdMs) {
      reportFreeze();
    }
    
    lastCheck = now;
  }, 1000);

  return () => clearInterval(intervalId);
}

/**
 * Setup beforeunload handler for crash detection
 */
export function setupCrashDetection(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeunload', () => {
    localStorage.setItem('vis-o-last-session', JSON.stringify({
      timestamp: Date.now(),
      url: window.location.href,
      actions: lastActions.slice(-10),
    }));
  });

  const lastSession = localStorage.getItem('vis-o-last-session');
  if (lastSession) {
    try {
      const session = JSON.parse(lastSession);
      const timeSinceLastSession = Date.now() - session.timestamp;
      
      if (timeSinceLastSession < 5000) {
        reportCrash();
      }
    } catch {
      // Invalid session data
    }
    localStorage.removeItem('vis-o-last-session');
  }
}

/**
 * Setup memory monitoring
 */
export function setupMemoryMonitoring(thresholdMB: number = 500): () => void {
  const intervalId = setInterval(() => {
    const usage = getMemoryUsage();
    if (usage && usage > thresholdMB * 1024 * 1024) {
      reportOOM();
    }
  }, 10000);

  return () => clearInterval(intervalId);
}

export default {
  trackAction,
  reportCrash,
  reportFreeze,
  reportOOM,
  setupFreezeDetection,
  setupCrashDetection,
  setupMemoryMonitoring,
};
