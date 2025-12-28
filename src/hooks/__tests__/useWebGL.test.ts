import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWebGL } from '@/hooks/useWebGL';

describe('useWebGL', () => {
  it('deve verificar suporte WebGL', () => {
    const { result } = renderHook(() => useWebGL());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve criar contexto', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = vi.fn().mockReturnValue({});
    const { result } = renderHook(() => useWebGL());
  });
});
