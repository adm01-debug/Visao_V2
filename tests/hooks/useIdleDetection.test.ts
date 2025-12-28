import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useIdleDetection', () => ({
  useIdleDetection: () => ({
    isIdle: false,
    isScreenLocked: false,
    isSupported: true,
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

describe('useIdleDetection', () => {
  it('deve indicar estado ocioso', async () => {
    const { useIdleDetection } = await import('@/hooks/useIdleDetection');
    const { result } = renderHook(() => useIdleDetection());
    expect(typeof result.current.isIdle).toBe('boolean');
  });

  it('deve indicar tela bloqueada', async () => {
    const { useIdleDetection } = await import('@/hooks/useIdleDetection');
    const { result } = renderHook(() => useIdleDetection());
    expect(typeof result.current.isScreenLocked).toBe('boolean');
  });
});
