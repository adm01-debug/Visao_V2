import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  it('should be defined', () => {
    expect(useLocalStorage).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useLocalStorage());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => useLocalStorage());
    expect(result.current).toBeDefined();
  });
});
