/**
 * VISÃO - Centralized Error Reporter
 * 
 * Captures errors from ErrorBoundaries and global handlers,
 * persists them to the database for monitoring/alerting.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  source: 'error_boundary' | 'route_error_boundary' | 'global' | 'unhandled_rejection';
  routeName?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE_SIZE = 20;
const DEDUP_WINDOW_MS = 30_000;

const queue: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
const recentHashes = new Map<string, number>();

function errorHash(report: ErrorReport): string {
  return `${report.source}::${report.message}::${report.routeName ?? ''}`;
}

function isDuplicate(report: ErrorReport): boolean {
  const hash = errorHash(report);
  const lastSeen = recentHashes.get(hash);
  const now = Date.now();
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
    return true;
  }
  recentHashes.set(hash, now);
  // Cleanup old entries
  if (recentHashes.size > 100) {
    const cutoff = now - DEDUP_WINDOW_MS;
    for (const [key, ts] of recentHashes) {
      if (ts < cutoff) recentHashes.delete(key);
    }
  }
  return false;
}

function buildReport(
  error: Error,
  source: ErrorReport['source'],
  extra?: { componentStack?: string; routeName?: string; metadata?: Record<string, unknown> }
): ErrorReport {
  return {
    message: error.message,
    stack: error.stack?.slice(0, 2000),
    componentStack: extra?.componentStack?.slice(0, 1000),
    source,
    routeName: extra?.routeName,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    metadata: extra?.metadata,
  };
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;

  const batch = queue.splice(0);
  const log = logger.child('ErrorReporter');

  try {
    const rows = batch.map((r) => ({
      operation: 'error_boundary_capture',
      severity: 'error',
      duration_ms: 0,
      table_name: r.source,
      error_message: [
        r.routeName ? `[${r.routeName}]` : '',
        r.message,
        r.componentStack ? `\n---componentStack---\n${r.componentStack}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .slice(0, 4000),
      rpc_name: r.url,
    }));

    const { error } = await supabase.from('query_telemetry').insert(rows);
    if (error) {
      log.warn('Failed to persist error reports', { error: error.message });
      // Re-queue on transient failures (but don't exceed max)
      if (queue.length + batch.length <= MAX_QUEUE_SIZE) {
        queue.push(...batch);
      }
    } else {
      log.info(`Flushed ${batch.length} error report(s)`);
    }
  } catch (err) {
    log.warn('Error reporter flush failed', { err });
  }
}

function enqueue(report: ErrorReport): void {
  if (isDuplicate(report)) return;

  queue.push(report);
  if (queue.length >= MAX_QUEUE_SIZE) {
    void flush();
  }
}

function ensureTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}

// --- Public API ---

export const errorReporter = {
  /** Report an error caught by an ErrorBoundary */
  captureComponentError(
    error: Error,
    componentStack?: string,
    routeName?: string
  ): void {
    const source = routeName ? 'route_error_boundary' : 'error_boundary';
    const report = buildReport(error, source, { componentStack, routeName });
    logger.error(`[ErrorReporter] ${source}`, { message: error.message, routeName });
    enqueue(report);
    ensureTimer();
  },

  /** Report a global unhandled error */
  captureGlobalError(error: Error, source: 'global' | 'unhandled_rejection' = 'global'): void {
    const report = buildReport(error, source);
    logger.error(`[ErrorReporter] ${source}`, { message: error.message });
    enqueue(report);
    ensureTimer();
  },

  /** Force flush pending reports */
  flush,

  /** Install global window error listeners */
  installGlobalHandlers(): void {
    window.addEventListener('error', (event) => {
      if (event.error instanceof Error) {
        errorReporter.captureGlobalError(event.error, 'global');
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      errorReporter.captureGlobalError(error, 'unhandled_rejection');
    });

    // Flush on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      }
    });

    ensureTimer();
    logger.info('Global error handlers installed', undefined, 'ErrorReporter');
  },
};

export default errorReporter;
