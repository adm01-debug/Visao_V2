import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarStatus } from '../useSidebarStatus';

describe('useSidebarStatus', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useSidebarStatus());
    
    expect(result.current.isOpen).toBeDefined();
    expect(result.current.isCollapsed).toBeDefined();
  });

  it('toggles sidebar open/closed', () => {
    const { result } = renderHook(() => useSidebarStatus());
    
    const initialState = result.current.isOpen;
    
    act(() => {
      result.current.toggle();
    });
    
    expect(result.current.isOpen).toBe(!initialState);
  });

  it('opens sidebar', () => {
    const { result } = renderHook(() => useSidebarStatus());
    
    act(() => {
      result.current.open();
    });
    
    expect(result.current.isOpen).toBe(true);
  });

  it('closes sidebar', () => {
    const { result } = renderHook(() => useSidebarStatus());
    
    act(() => {
      result.current.open();
      result.current.close();
    });
    
    expect(result.current.isOpen).toBe(false);
  });

  it('toggles collapsed state', () => {
    const { result } = renderHook(() => useSidebarStatus());
    
    act(() => {
      result.current.toggleCollapse();
    });
    
    expect(result.current.isCollapsed).toBeDefined();
  });
});
