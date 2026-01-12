/**
 * Performance Monitoring
 * @module lib/performanceMonitor
 */

interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private metrics: Map<string, number[]> = new Map();

  start(name: string): void {
    this.marks.set(name, { name, startTime: performance.now() });
  }

  end(name: string): number {
    const mark = this.marks.get(name);
    if (!mark) return 0;
    
    const duration = performance.now() - mark.startTime;
    mark.duration = duration;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
    
    return duration;
  }

  measure(name: string, fn: () => void): number {
    this.start(name);
    fn();
    return this.end(name);
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    const result = await fn();
    this.end(name);
    return result;
  }

  getAverage(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  getMetrics(name: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;
    
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  clear(): void {
    this.marks.clear();
    this.metrics.clear();
  }

  reportWebVitals(): void {
    if (typeof window === 'undefined') return;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log or send to analytics
      }
    });
    
    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
