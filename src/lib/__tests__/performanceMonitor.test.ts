import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performanceMonitor } from '../performanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  it('should measure sync operations', () => {
    const duration = performanceMonitor.measure('test', () => {
      // Simulate work
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
    });

    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should measure async operations', async () => {
    const result = await performanceMonitor.measureAsync('asyncTest', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'done';
    });

    expect(result).toBe('done');
  });

  it('should track metrics', () => {
    performanceMonitor.start('track');
    performanceMonitor.end('track');
    performanceMonitor.start('track');
    performanceMonitor.end('track');

    const metrics = performanceMonitor.getMetrics('track');
    expect(metrics).not.toBeNull();
    expect(metrics?.count).toBe(2);
  });

  it('should calculate average', () => {
    performanceMonitor.start('avg');
    performanceMonitor.end('avg');
    
    const avg = performanceMonitor.getAverage('avg');
    expect(avg).toBeGreaterThanOrEqual(0);
  });
});
