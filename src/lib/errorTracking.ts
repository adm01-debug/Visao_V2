/**
 * Error tracking utility
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>): void {
  console.error('[ErrorTracking]', error, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info']('[ErrorTracking]', message);
}

export default { captureException, captureMessage };
