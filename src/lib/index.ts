/**
 * VIS-O Library Utilities
 * Central export point for all lib utilities
 */

// Core utilities
export * from './logger';
export * from './api';
export * from './supabase';

// Security
export * from './security';
export * from './auth';
export * from './encryption';
export * from './csrf';
export * from './xss';
export * from './sanitization';

// Performance
export * from './lazyLoad';
export * from './performanceUtils';
export * from './imageOptimizer';
export * from './renderOptimizer';
export * from './bundleOptimizer';
export * from './memoization';
export * from './cacheUtils';

// Error handling
export * from './errorHandler';
export * from './sentry';
export * from './errorReporting';
export * from './crashReporting';

// Accessibility
export * from './accessibility';

// Offline
export * from './offline';

// Internationalization
export { default as i18n } from '../i18n';

// Utils
export * from './intrusionDetection';
