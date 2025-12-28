import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

describe('useSpeechRecognition', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve retornar transcript', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.transcript).toBeDefined();
  });
});
