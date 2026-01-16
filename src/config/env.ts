/**
 * Environment Configuration
 * Validates and exports environment variables
 */

// Supabase configuration
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// API configuration
export const apiUrl = import.meta.env.VITE_API_URL || '/api';

// Sentry configuration
export const sentryDsn = import.meta.env.VITE_SENTRY_DSN || '';

// Feature flags
export const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

// Environment checks
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

// Validate environment
export const validateEnv = (): boolean => {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    if (import.meta.env.DEV) {
      // Missing env vars validation - silent in production
    }
    return false;
  }

  return true;
};

// Export all env variables
export const env = {
  supabaseUrl,
  supabaseAnonKey,
  apiUrl,
  sentryDsn,
  enableAnalytics,
  isDevelopment,
  isProduction,
  validateEnv,
};

export default env;
