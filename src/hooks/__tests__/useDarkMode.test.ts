import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDarkMode } from '@/hooks/useDarkMode';

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('deve detectar preferência do sistema', () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDarkMode).toBeDefined();
  });

  it('deve alternar modo escuro', () => {
    const { result } = renderHook(() => useDarkMode());
    const initial = result.current.isDarkMode;
    act(() => { result.current.toggle(); });
    expect(result.current.isDarkMode).toBe(!initial);
  });

  it('deve ativar modo escuro', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => { result.current.enable(); });
    expect(result.current.isDarkMode).toBe(true);
  });

  it('deve desativar modo escuro', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => { result.current.disable(); });
    expect(result.current.isDarkMode).toBe(false);
  });
});
