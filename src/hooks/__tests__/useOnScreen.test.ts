import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOnScreen } from '@/hooks/useOnScreen';

describe('useOnScreen', () => {
  beforeEach(() => {
    const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
    window.IntersectionObserver = mockIntersectionObserver as any;
  });

  it('deve retornar ref', () => {
    const { result } = renderHook(() => useOnScreen());
    expect(result.current.ref).toBeDefined();
  });

  it('deve retornar estado de visibilidade', () => {
    const { result } = renderHook(() => useOnScreen());
    expect(result.current.isVisible).toBeDefined();
  });
});
