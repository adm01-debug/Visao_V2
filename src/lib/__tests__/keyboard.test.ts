import { describe, it, expect, vi } from 'vitest';
import { isKey, getKeyCode, isModifierKey, createKeyHandler } from '../keyboard';

describe('keyboard utilities', () => {
  describe('isKey', () => {
    it('checks key', () => {
      const event = { key: 'Enter' } as KeyboardEvent;
      expect(isKey(event, 'Enter')).toBe(true);
    });
  });

  describe('getKeyCode', () => {
    it('returns key code', () => {
      const event = { key: 'a', keyCode: 65 } as KeyboardEvent;
      expect(getKeyCode(event)).toBe(65);
    });
  });

  describe('isModifierKey', () => {
    it('detects modifier keys', () => {
      expect(isModifierKey({ key: 'Control' } as KeyboardEvent)).toBe(true);
      expect(isModifierKey({ key: 'Shift' } as KeyboardEvent)).toBe(true);
      expect(isModifierKey({ key: 'a' } as KeyboardEvent)).toBe(false);
    });
  });

  describe('createKeyHandler', () => {
    it('creates handler for specific key', () => {
      const handler = vi.fn();
      const keyHandler = createKeyHandler('Enter', handler);
      keyHandler({ key: 'Enter' } as KeyboardEvent);
      expect(handler).toHaveBeenCalled();
    });
  });
});
