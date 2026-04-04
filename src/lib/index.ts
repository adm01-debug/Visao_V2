/**
 * VISÃO - Lib barrel export
 */

// Core utilities
export { cn } from '@/lib/utils';

// Feature flags
export * from './featureFlags';

// Performance
export * from './performanceMonitor';

// A/B Testing
export * from './abTesting';

// Cache
export * from './cache';

// Error handling
export * from './errorHandler';

// Analytics
export * from './analytics';

// Auth
export * from './auth';

// Config
export * from './config';

// Constants
export * from './constants';

// Logger
export * from './logger';

// API Client
export * from './apiClient';
export * from './apiError';

// Metrics
export * from './metrics';

// Sentry – setUser collides with ./analytics
// Re-export with aliases
export {
  initSentry,
  captureError as captureSentryError,
  captureMessage as captureSentryMessage,
  setUser as setSentryUser,
  clearUser as clearSentryUser,
} from './sentry';
