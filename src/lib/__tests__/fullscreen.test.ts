import { describe, it, expect, vi } from 'vitest';
import { requestFullscreen, exitFullscreen, isFullscreen, toggleFullscreen } from '../fullscreen';

describe('fullscreen utilities', () => {
  describe('requestFullscreen', () => {
    it('requests fullscreen', async () => {
      const el = document.createElement('div');
      el.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      await requestFullscreen(el);
      expect(el.requestFullscreen).toHaveBeenCalled();
    });
  });

  describe('exitFullscreen', () => {
    it('exits fullscreen', async () => {
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
      await exitFullscreen();
      expect(document.exitFullscreen).toHaveBeenCalled();
    });
  });

  describe('isFullscreen', () => {
    it('checks fullscreen state', () => {
      expect(isFullscreen()).toBe(false);
    });
  });
});
