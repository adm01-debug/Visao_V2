import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useElementSize } from '@/hooks/useElementSize';

describe('useElementSize', () => {
  it('returns ref and size', () => {
    const { result } = renderHook(() => useElementSize());
    expect(result.current.ref).toBeDefined();
    expect(result.current.width).toBeDefined();
    expect(result.current.height).toBeDefined();
  });

  it('initializes with zero size', () => {
    const { result } = renderHook(() => useElementSize());
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
  });
});
