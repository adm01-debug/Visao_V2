import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/react";

export const initSentry = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  }
};

export const captureError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error);
  if (import.meta.env.PROD) {
    Sentry.captureException(error, { extra: context });
  }
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, level);
  }
};

export const setUser = (user: { id: string; email?: string }) => {
  Sentry.setUser(user);
};

export const clearUser = () => {
  Sentry.setUser(null);
};

export { Sentry };
