import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePerformanceMetrics } from '../usePerformanceMetrics';

describe('usePerformanceMetrics', () => {
  it('returns initial metrics', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    expect(result.current.metrics).toBeDefined();
    expect(result.current.startMeasure).toBeDefined();
    expect(result.current.endMeasure).toBeDefined();
  });

  it('measures performance', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.startMeasure('test');
    });
    
    act(() => {
      result.current.endMeasure('test');
    });
    
    expect(result.current.metrics.test).toBeDefined();
  });

  it('tracks multiple measurements', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.startMeasure('measure1');
      result.current.endMeasure('measure1');
      result.current.startMeasure('measure2');
      result.current.endMeasure('measure2');
    });
    
    expect(result.current.metrics.measure1).toBeDefined();
    expect(result.current.metrics.measure2).toBeDefined();
  });

  it('clears metrics', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    
    act(() => {
      result.current.startMeasure('test');
      result.current.endMeasure('test');
      result.current.clearMetrics();
    });
    
    expect(result.current.metrics).toEqual({});
  });
});
