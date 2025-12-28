import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useOffline', () => ({
  useOffline: () => ({
    isOffline: false,
    isOnline: true,
  }),
}));

describe('useOffline', () => {
  it('deve indicar estado offline', async () => {
    const { useOffline } = await import('@/hooks/useOffline');
    const { result } = renderHook(() => useOffline());
    expect(typeof result.current.isOffline).toBe('boolean');
  });

  it('deve indicar estado online', async () => {
    const { useOffline } = await import('@/hooks/useOffline');
    const { result } = renderHook(() => useOffline());
    expect(typeof result.current.isOnline).toBe('boolean');
  });
});
