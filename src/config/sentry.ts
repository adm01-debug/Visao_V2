import { ENV } from './env';

export const SENTRY_CONFIG = {
  dsn: ENV.SENTRY_DSN,
  environment: ENV.MODE,
  enabled: ENV.PROD && !!ENV.SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
};
