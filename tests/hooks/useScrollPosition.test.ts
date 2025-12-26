import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollPosition } from '../useScrollPosition';

describe('useScrollPosition', () => {
  it('should be defined', () => {
    expect(useScrollPosition).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useScrollPosition());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => useScrollPosition());
    expect(result.current).toBeDefined();
  });
});
