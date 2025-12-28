import { describe, it, expect, beforeEach } from 'vitest';
import { useAiStore } from '@/stores/aiStore';
import { act, renderHook } from '@testing-library/react';

describe('aiStore', () => {
  beforeEach(() => { useAiStore.getState().reset(); });

  it('deve iniciar com estado padrão', () => {
    const { result } = renderHook(() => useAiStore());
    expect(result.current.isProcessing).toBe(false);
  });

  it('deve iniciar análise', () => {
    const { result } = renderHook(() => useAiStore());
    act(() => { result.current.startAnalysis(); });
    expect(result.current.isProcessing).toBe(true);
  });

  it('deve finalizar análise', () => {
    const { result } = renderHook(() => useAiStore());
    act(() => { result.current.startAnalysis(); });
    act(() => { result.current.completeAnalysis({ result: 'ok' }); });
    expect(result.current.isProcessing).toBe(false);
  });
});
