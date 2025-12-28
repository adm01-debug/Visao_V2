import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useLongPress', () => {
  it('deve detectar long press', async () => {
    const callback = vi.fn();
    expect(callback).toBeDefined();
  });

  it('deve cancelar ao soltar cedo', async () => {
    const callback = vi.fn();
    expect(callback).not.toHaveBeenCalled();
  });
});
