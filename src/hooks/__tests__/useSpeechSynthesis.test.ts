import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

describe('useSpeechSynthesis', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve falar texto', () => {
    window.speechSynthesis = { speak: vi.fn(), cancel: vi.fn() } as any;
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => { result.current.speak('Hello'); });
  });
});
