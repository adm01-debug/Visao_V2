import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePageTracking } from '@/hooks/usePageTracking';

describe('usePageTracking', () => {
  it('deve rastrear mudança de página', () => {
    const onPageChange = vi.fn();
    renderHook(() => usePageTracking(onPageChange));
    expect(onPageChange).toHaveBeenCalled();
  });

  it('deve passar pathname para callback', () => {
    const onPageChange = vi.fn();
    renderHook(() => usePageTracking(onPageChange));
    expect(onPageChange).toHaveBeenCalledWith(expect.any(String));
  });
});
