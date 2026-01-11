/**
 * Error Reporting Utilities
 * Centralized error tracking and reporting
 * @module lib/errorReporting
 */

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorReportingConfig {
  endpoint?: string;
  enabled: boolean;
  sampleRate: number;
  ignorePatterns: RegExp[];
}

const config: ErrorReportingConfig = {
  endpoint: import.meta.env.VITE_ERROR_REPORTING_ENDPOINT as string | undefined,
  enabled: import.meta.env.PROD,
  sampleRate: 1.0,
  ignorePatterns: [
    /ResizeObserver loop/,
    /Loading chunk \d+ failed/,
    /Network request failed/,
    /Failed to fetch/,
    /AbortError/,
  ],
};

/**
 * Check if error should be ignored
 */
function shouldIgnoreError(error: Error): boolean {
  return config.ignorePatterns.some(pattern => 
    pattern.test(error.message)
  );
}

/**
 * Check if error should be sampled
 */
function shouldSampleError(): boolean {
  return Math.random() < config.sampleRate;
}

/**
 * Create error report object
 */
function createErrorReport(
  error: Error,
  metadata?: Record<string, unknown>
): ErrorReport {
  return {
    message: error.message,
    stack: error.stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    metadata,
  };
}

/**
 * Send error report to endpoint
 */
async function sendErrorReport(report: ErrorReport): Promise<void> {
  if (!config.endpoint) return;

  try {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  } catch {
    // Silent fail - don't cause more errors
  }
}

/**
 * Report error
 */
export async function reportError(
  error: Error,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!config.enabled) return;
  if (shouldIgnoreError(error)) return;
  if (!shouldSampleError()) return;

  const report = createErrorReport(error, metadata);
  await sendErrorReport(report);
}

/**
 * Report React error boundary error
 */
export async function reportReactError(
  error: Error,
  componentStack: string
): Promise<void> {
  const report = createErrorReport(error, { componentStack });
  report.componentStack = componentStack;
  await sendErrorReport(report);
}

/**
 * Configure error reporting
 */
export function configureErrorReporting(
  options: Partial<ErrorReportingConfig>
): void {
  Object.assign(config, options);
}

/**
 * Add ignore pattern
 */
export function addIgnorePattern(pattern: RegExp): void {
  config.ignorePatterns.push(pattern);
}

/**
 * Set sample rate (0-1)
 */
export function setSampleRate(rate: number): void {
  config.sampleRate = Math.max(0, Math.min(1, rate));
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.onerror = (message, source, lineno, colno, error) => {
    if (error) {
      reportError(error, { source, lineno, colno });
    }
  };

  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    reportError(error, { type: 'unhandledrejection' });
  };
}

export default {
  reportError,
  reportReactError,
  configureErrorReporting,
  addIgnorePattern,
  setSampleRate,
  setupGlobalErrorHandlers,
};
