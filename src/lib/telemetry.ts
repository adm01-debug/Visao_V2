import { trackEvent } from './analytics';
import { recordMetric } from './metrics';

export interface TelemetryEvent {
  type: 'action' | 'error' | 'performance' | 'navigation';
  name: string;
  data?: Record<string, unknown>;
}

export const sendTelemetry = (event: TelemetryEvent): void => {
  trackEvent(`telemetry_${event.type}`, { name: event.name, ...event.data });
};

export const trackUserAction = (action: string, data?: Record<string, unknown>): void => {
  sendTelemetry({ type: 'action', name: action, data });
};

export const trackPerformance = (name: string, duration: number): void => {
  recordMetric(`perf_${name}`, duration);
  sendTelemetry({ type: 'performance', name, data: { duration } });
};

export const trackNavigation = (from: string, to: string): void => {
  sendTelemetry({ type: 'navigation', name: 'route_change', data: { from, to } });
};

export const withTelemetry = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string
): T => {
  return ((...args: unknown[]) => {
    const start = performance.now();
    const result = fn(...args);
    trackPerformance(name, performance.now() - start);
    return result;
  }) as T;
};
