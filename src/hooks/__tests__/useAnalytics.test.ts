/**
 * @fileoverview Testes para useAnalytics hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAnalytics } from '@/hooks/useAnalytics';

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).gtag = vi.fn();
  });

  it('deve trackear evento', () => {
    const { result } = renderHook(() => useAnalytics());
    
    act(() => {
      result.current.trackEvent('button_click', { label: 'test' });
    });
    
    expect((window as any).gtag).toHaveBeenCalledWith('event', 'button_click', expect.any(Object));
  });

  it('deve trackear page view', () => {
    const { result } = renderHook(() => useAnalytics());
    
    act(() => {
      result.current.trackPageView('/dashboard');
    });
    
    expect((window as any).gtag).toHaveBeenCalled();
  });

  it('deve trackear timing', () => {
    const { result } = renderHook(() => useAnalytics());
    
    act(() => {
      result.current.trackTiming('load', 1000);
    });
    
    expect((window as any).gtag).toHaveBeenCalled();
  });

  it('deve lidar com gtag não definido', () => {
    delete (window as any).gtag;
    const { result } = renderHook(() => useAnalytics());
    
    expect(() => {
      result.current.trackEvent('test', {});
    }).not.toThrow();
  });
});
