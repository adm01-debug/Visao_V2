import { describe, it, expect, vi } from 'vitest';
import { fadeIn, fadeOut, slideIn, slideOut, animate, easeInOut } from '../animation';

describe('animation utilities', () => {
  describe('fadeIn', () => {
    it('returns animation config', () => {
      const config = fadeIn({ duration: 300 });
      expect(config.duration).toBe(300);
    });
  });

  describe('fadeOut', () => {
    it('returns animation config', () => {
      const config = fadeOut({ duration: 300 });
      expect(config.duration).toBe(300);
    });
  });

  describe('slideIn', () => {
    it('returns animation config with direction', () => {
      const config = slideIn({ direction: 'left' });
      expect(config.direction).toBe('left');
    });
  });

  describe('slideOut', () => {
    it('returns animation config with direction', () => {
      const config = slideOut({ direction: 'right' });
      expect(config.direction).toBe('right');
    });
  });

  describe('easeInOut', () => {
    it('returns easing function', () => {
      expect(easeInOut(0)).toBe(0);
      expect(easeInOut(0.5)).toBe(0.5);
      expect(easeInOut(1)).toBe(1);
    });
  });
});
