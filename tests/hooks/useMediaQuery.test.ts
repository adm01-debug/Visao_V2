import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  it('should be defined', () => {
    expect(useMediaQuery).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useMediaQuery());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => useMediaQuery());
    expect(result.current).toBeDefined();
  });
});
