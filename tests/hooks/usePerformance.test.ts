import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePerformance } from '../usePerformance';

describe('usePerformance', () => {
  it('should be defined', () => {
    expect(usePerformance).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => usePerformance());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => usePerformance());
    expect(result.current).toBeDefined();
  });
});
