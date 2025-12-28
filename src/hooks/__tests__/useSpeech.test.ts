import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSpeech } from '@/hooks/useSpeech';

describe('useSpeech', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useSpeech());
    expect(result.current.isSupported).toBeDefined();
  });
});
