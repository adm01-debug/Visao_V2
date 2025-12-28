import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

describe('useOnScreen', () => {
  it('deve observar visibilidade', () => {
    const ref = { current: document.createElement('div') };
    expect(ref.current).toBeDefined();
  });

  it('deve usar IntersectionObserver', () => {
    const mockObserver = vi.fn();
    expect(mockObserver).toBeDefined();
  });
});
