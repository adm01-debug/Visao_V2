import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUtilities } from '../useUtilities';

describe('useUtilities', () => {
  it('returns utility functions', () => {
    const { result } = renderHook(() => useUtilities());
    
    expect(result.current).toBeDefined();
  });

  it('provides formatDate function', () => {
    const { result } = renderHook(() => useUtilities());
    
    expect(result.current.formatDate).toBeDefined();
    expect(typeof result.current.formatDate).toBe('function');
  });

  it('provides formatCurrency function', () => {
    const { result } = renderHook(() => useUtilities());
    
    expect(result.current.formatCurrency).toBeDefined();
    expect(typeof result.current.formatCurrency).toBe('function');
  });

  it('provides debounce function', () => {
    const { result } = renderHook(() => useUtilities());
    
    expect(result.current.debounce).toBeDefined();
    expect(typeof result.current.debounce).toBe('function');
  });

  it('provides throttle function', () => {
    const { result } = renderHook(() => useUtilities());
    
    expect(result.current.throttle).toBeDefined();
    expect(typeof result.current.throttle).toBe('function');
  });
});
