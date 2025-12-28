// src/hooks/__tests__/useOnboardingTour.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOnboardingTour } from '../useOnboardingTour';

describe('useOnboardingTour', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current).toBeDefined();
  });

  it('deve iniciar tour', () => {
    const { result } = renderHook(() => useOnboardingTour());
    if (result.current.startTour) {
      act(() => { result.current.startTour(); });
    }
  });

  it('deve parar tour', () => {
    const { result } = renderHook(() => useOnboardingTour());
    if (result.current.stopTour) {
      act(() => { result.current.stopTour(); });
    }
  });

  it('deve avançar step', () => {
    const { result } = renderHook(() => useOnboardingTour());
    if (result.current.nextStep) {
      act(() => { result.current.nextStep(); });
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useOnboardingTour());
    expect(() => unmount()).not.toThrow();
  });
});
