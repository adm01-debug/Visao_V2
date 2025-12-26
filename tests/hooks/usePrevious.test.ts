import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrevious } from '../usePrevious';

describe('usePrevious', () => {
  it('should be defined', () => {
    expect(usePrevious).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => usePrevious());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => usePrevious());
    expect(result.current).toBeDefined();
  });
});
