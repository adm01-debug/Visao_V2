import { describe, it, expect, beforeEach } from 'vitest';
import { useIntegrationStore } from '@/stores/integrationStore';
import { act, renderHook } from '@testing-library/react';

describe('integrationStore', () => {
  beforeEach(() => { useIntegrationStore.getState().reset(); });

  it('deve registrar integração', () => {
    const { result } = renderHook(() => useIntegrationStore());
    act(() => { result.current.register({ id: 'slack', name: 'Slack', enabled: true }); });
    expect(result.current.integrations).toHaveLength(1);
  });

  it('deve toggle integração', () => {
    const { result } = renderHook(() => useIntegrationStore());
    act(() => { result.current.register({ id: 'slack', name: 'Slack', enabled: true }); });
    act(() => { result.current.toggle('slack'); });
    expect(result.current.integrations[0].enabled).toBe(false);
  });
});
