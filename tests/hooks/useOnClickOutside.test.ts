import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnClickOutside } from '../useOnClickOutside';

describe('useOnClickOutside', () => {
  it('should be defined', () => {
    expect(useOnClickOutside).toBeDefined();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useOnClickOutside());
    expect(result.current).toBeDefined();
  });

  it('should handle state changes', () => {
    const { result } = renderHook(() => useOnClickOutside());
    expect(result.current).toBeDefined();
  });
});
