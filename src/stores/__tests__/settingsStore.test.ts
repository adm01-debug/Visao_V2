import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { act, renderHook } from '@testing-library/react';

describe('settingsStore', () => {
  beforeEach(() => { useSettingsStore.getState().reset(); });

  it('deve atualizar configuração', () => {
    const { result } = renderHook(() => useSettingsStore());
    act(() => { result.current.update('theme', 'dark'); });
    expect(result.current.settings.theme).toBe('dark');
  });

  it('deve resetar configurações', () => {
    const { result } = renderHook(() => useSettingsStore());
    act(() => { result.current.update('theme', 'dark'); });
    act(() => { result.current.reset(); });
    expect(result.current.settings.theme).toBe('light');
  });
});
