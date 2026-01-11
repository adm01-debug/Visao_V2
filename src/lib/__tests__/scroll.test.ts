import { describe, it, expect, vi } from 'vitest';
import { scrollTo, scrollToTop, scrollToElement, getScrollPosition, isScrolledToBottom } from '../scroll';

describe('scroll utilities', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  describe('scrollTo', () => {
    it('scrolls to position', () => {
      scrollTo({ top: 100 });
      expect(window.scrollTo).toHaveBeenCalled();
    });
  });

  describe('scrollToTop', () => {
    it('scrolls to top', () => {
      scrollToTop();
      expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    });
  });

  describe('getScrollPosition', () => {
    it('returns scroll position', () => {
      const pos = getScrollPosition();
      expect(pos).toHaveProperty('x');
      expect(pos).toHaveProperty('y');
    });
  });
});
