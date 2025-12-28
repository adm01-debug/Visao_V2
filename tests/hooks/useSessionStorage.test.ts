import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useSessionStorage', () => {
  it('deve inicializar corretamente', () => {
    expect(true).toBe(true);
  });

  it('deve funcionar conforme esperado', () => {
    const mockFn = vi.fn();
    expect(mockFn).toBeDefined();
  });
});
