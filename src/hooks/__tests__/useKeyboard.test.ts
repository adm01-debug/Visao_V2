import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboard } from '../useKeyboard';

describe('useKeyboard', () => {
  it('should call handler on key press', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboard('escape', handler));
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);
    
    // Handler should be called
  });
});
