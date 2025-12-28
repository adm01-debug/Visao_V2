import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/stores/uiStore';
import { act, renderHook } from '@testing-library/react';

describe('uiStore', () => {
  beforeEach(() => { useUiStore.getState().reset(); });

  it('deve alternar sidebar', () => {
    const { result } = renderHook(() => useUiStore());
    act(() => { result.current.toggleSidebar(); });
    expect(result.current.sidebarOpen).toBe(true);
  });

  it('deve abrir modal', () => {
    const { result } = renderHook(() => useUiStore());
    act(() => { result.current.openModal('settings'); });
    expect(result.current.activeModal).toBe('settings');
  });

  it('deve fechar modal', () => {
    const { result } = renderHook(() => useUiStore());
    act(() => { result.current.openModal('settings'); });
    act(() => { result.current.closeModal(); });
    expect(result.current.activeModal).toBeNull();
  });
});
