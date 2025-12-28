import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useUpdatePrompt } from '@/hooks/useUpdatePrompt';

describe('useUpdatePrompt', () => {
  it('deve retornar estado de atualização', () => {
    const { result } = renderHook(() => useUpdatePrompt());
    expect(result.current.hasUpdate).toBeDefined();
  });

  it('deve fornecer função de atualização', () => {
    const { result } = renderHook(() => useUpdatePrompt());
    expect(result.current.update).toBeInstanceOf(Function);
  });
});
