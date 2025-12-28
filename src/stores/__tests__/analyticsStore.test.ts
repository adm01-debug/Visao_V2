import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { act, renderHook } from '@testing-library/react';

describe('analyticsStore', () => {
  beforeEach(() => { useAnalyticsStore.getState().reset(); });

  it('deve adicionar evento', () => {
    const { result } = renderHook(() => useAnalyticsStore());
    act(() => { result.current.trackEvent('page_view', { page: '/dashboard' }); });
    expect(result.current.events).toHaveLength(1);
  });

  it('deve obter métricas', () => {
    const { result } = renderHook(() => useAnalyticsStore());
    expect(result.current.getMetrics()).toBeDefined();
  });
});
