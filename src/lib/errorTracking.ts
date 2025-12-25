import * as Sentry from '@sentry/react';

export const initErrorTracking = (): void => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 1.0,
    });
  }
};

export const captureException = (error: Error, context?: Record<string, unknown>): void => {
  Sentry.captureException(error, { extra: context });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info'): void => {
  Sentry.captureMessage(message, level);
};

export const setUserContext = (user: { id: string; email?: string; username?: string }): void => {
  Sentry.setUser(user);
};

export const clearUserContext = (): void => {
  Sentry.setUser(null);
};

export const addBreadcrumb = (message: string, category?: string): void => {
  Sentry.addBreadcrumb({ message, category, level: 'info' });
};
