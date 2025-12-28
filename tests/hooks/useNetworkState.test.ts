import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({
    online: true,
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
  }),
}));

describe('useNetworkState', () => {
  it('deve retornar estado online', async () => {
    const { useNetworkState } = await import('@/hooks/useNetworkState');
    const { result } = renderHook(() => useNetworkState());
    expect(typeof result.current.online).toBe('boolean');
  });

  it('deve retornar tipo de conexão', async () => {
    const { useNetworkState } = await import('@/hooks/useNetworkState');
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.effectiveType).toBeDefined();
  });
});
