import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useScript } from '../useScript';

describe('useScript', () => {
  beforeEach(() => {
    // Clean up scripts
    document.querySelectorAll('script[src*="test"]').forEach(el => el.remove());
  });

  it('should start with loading status', () => {
    const { result } = renderHook(() => useScript('https://example.com/test.js'));
    expect(result.current).toBe('loading');
  });

  it('should return ready for existing scripts', () => {
    const script = document.createElement('script');
    script.src = 'https://example.com/existing.js';
    document.body.appendChild(script);

    const { result } = renderHook(() => useScript('https://example.com/existing.js'));
    expect(result.current).toBe('ready');
    
    script.remove();
  });
});
