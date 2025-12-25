import { onCLS, onFID, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { recordMetric } from './metrics';

export const initPerformanceMonitoring = (): void => {
  const reportMetric = (metric: Metric) => {
    recordMetric(metric.name, metric.value, { id: metric.id });
  };

  onCLS(reportMetric);
  onFID(reportMetric);
  onLCP(reportMetric);
  onFCP(reportMetric);
  onTTFB(reportMetric);
};

export const measureRender = (componentName: string): () => void => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    recordMetric(`render_${componentName}`, duration);
  };
};

export const getPerformanceEntries = (type?: string): PerformanceEntry[] => {
  if (type) return performance.getEntriesByType(type);
  return performance.getEntries();
};

export const markStart = (name: string): void => {
  performance.mark(`${name}_start`);
};

export const markEnd = (name: string): number => {
  performance.mark(`${name}_end`);
  const measure = performance.measure(name, `${name}_start`, `${name}_end`);
  return measure.duration;
};
