import { describe, it, expect, vi } from 'vitest';
import { copyToClipboard, readFromClipboard, isClipboardSupported } from '../clipboard';

describe('clipboard utilities', () => {
  describe('copyToClipboard', () => {
    it('copies text to clipboard', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
      });
      await copyToClipboard('test');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test');
    });
  });

  describe('readFromClipboard', () => {
    it('reads from clipboard', async () => {
      Object.assign(navigator, {
        clipboard: { readText: vi.fn().mockResolvedValue('test') }
      });
      const text = await readFromClipboard();
      expect(text).toBe('test');
    });
  });

  describe('isClipboardSupported', () => {
    it('checks clipboard support', () => {
      expect(typeof isClipboardSupported()).toBe('boolean');
    });
  });
});
