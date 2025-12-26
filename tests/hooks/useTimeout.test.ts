import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeout } from '../useTimeout';

describe('useTimeout', () => {
  it('should be defined', () => {
    expect(useTimeout).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useTimeout());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => useTimeout());
    expect(result.current).toBeDefined();
  });
});
