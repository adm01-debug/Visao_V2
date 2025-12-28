import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useVoice } from '@/hooks/useVoice';

describe('useVoice', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useVoice());
    expect(result.current.isSupported).toBeDefined();
  });
});
