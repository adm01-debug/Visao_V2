import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '@/stores/themeStore';
import { act, renderHook } from '@testing-library/react';

describe('themeStore', () => {
  beforeEach(() => { useThemeStore.getState().reset(); });

  it('deve alternar tema', () => {
    const { result } = renderHook(() => useThemeStore());
    const initial = result.current.theme;
    act(() => { result.current.toggle(); });
    expect(result.current.theme).not.toBe(initial);
  });

  it('deve definir tema', () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => { result.current.setTheme('dark'); });
    expect(result.current.theme).toBe('dark');
  });
});
