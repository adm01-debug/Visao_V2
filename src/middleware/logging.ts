import { logger } from '@/lib/logger';
export const loggingMiddleware = (request: Request): void => {
  logger.info('Request', { method: request.method, url: request.url, timestamp: new Date().toISOString() });
};
