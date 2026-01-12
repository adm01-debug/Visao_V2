import { describe, it, expect } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import { useHover } from '../useHover';

describe('useHover', () => {
  it('should return ref and false initially', () => {
    const { result } = renderHook(() => useHover<HTMLDivElement>());
    expect(result.current[1]).toBe(false);
  });
});
