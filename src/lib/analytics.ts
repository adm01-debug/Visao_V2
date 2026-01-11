type EventName = string;
type EventProperties = Record<string, unknown>;

let initialized = false;

export const initAnalytics = (): void => {
  if (initialized) return;
  initialized = true;
};

export const trackEvent = (name: EventName, properties?: EventProperties): void => {
  if (!initialized) return;
  // Analytics event tracked silently
};

export const trackPageView = (path: string, title?: string): void => {
  trackEvent('page_view', { path, title, timestamp: Date.now() });
};

export const trackError = (error: Error, context?: Record<string, unknown>): void => {
  trackEvent('error', { message: error.message, stack: error.stack, ...context });
};

export const setUser = (userId: string, traits?: Record<string, unknown>): void => {
  // User set silently
};

export const trackTiming = (category: string, variable: string, value: number): void => {
  trackEvent('timing', { category, variable, value });
};
