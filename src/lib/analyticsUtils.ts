/**
 * Analytics Utilities
 * @module lib/analyticsUtils
 */

export interface AnalyticsEvent { name: string; properties?: Record<string, unknown>; timestamp?: Date; }

const eventQueue: AnalyticsEvent[] = [];
let flushInterval: ReturnType<typeof setInterval> | null = null;

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  eventQueue.push({ name, properties, timestamp: new Date() });
}

export function trackPageView(page: string, properties?: Record<string, unknown>): void {
  trackEvent('page_view', { page, ...properties });
}

export function trackClick(element: string, properties?: Record<string, unknown>): void {
  trackEvent('click', { element, ...properties });
}

export function trackError(error: Error, context?: Record<string, unknown>): void {
  trackEvent('error', { message: error.message, stack: error.stack, ...context });
}

export function startSession(): string {
  const sessionId = Math.random().toString(36).slice(2);
  trackEvent('session_start', { sessionId });
  return sessionId;
}

export function endSession(sessionId: string): void {
  trackEvent('session_end', { sessionId });
}

export function getEventQueue(): AnalyticsEvent[] { return [...eventQueue]; }
export function clearEventQueue(): void { eventQueue.length = 0; }

export function startAutoFlush(callback: (events: AnalyticsEvent[]) => void, intervalMs = 30000): void {
  if (flushInterval) return;
  flushInterval = setInterval(() => {
    if (eventQueue.length > 0) {
      callback([...eventQueue]);
      clearEventQueue();
    }
  }, intervalMs);
}

export function stopAutoFlush(): void {
  if (flushInterval) { clearInterval(flushInterval); flushInterval = null; }
}

export default { trackEvent, trackPageView, trackClick, trackError, startSession, endSession, getEventQueue, clearEventQueue, startAutoFlush, stopAutoFlush };
