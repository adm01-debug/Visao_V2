/**
 * Error tracking utility
 */
import { logger } from '@/lib/logger';

export function captureException(error: Error | unknown, context?: Record<string, unknown>): void {
  logger.error('[ErrorTracking]', { error: error instanceof Error ? error.message : String(error), ...context });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (level === 'error') {
    logger.error('[ErrorTracking]', message);
  } else if (level === 'warning') {
    logger.warn('[ErrorTracking]', message);
  } else {
    logger.info('[ErrorTracking]', message);
  }
}

export default { captureException, captureMessage };
