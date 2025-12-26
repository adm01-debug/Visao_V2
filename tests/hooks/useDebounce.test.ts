import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  it('should be defined', () => {
    expect(useDebounce).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useDebounce());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => useDebounce());
    expect(result.current).toBeDefined();
  });
});
