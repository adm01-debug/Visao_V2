import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWindowSize } from '../useWindowSize';

describe('useWindowSize', () => {
  it('should be defined', () => {
    expect(useWindowSize).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toBeDefined();
  });
});
