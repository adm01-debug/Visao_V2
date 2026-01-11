import { describe, it, expect, vi } from 'vitest';
import { getElement, addClass, removeClass, toggleClass, hasClass, setStyles, getStyles } from '../dom';

describe('dom utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="test" class="initial"></div>';
  });

  describe('getElement', () => {
    it('gets element by selector', () => {
      expect(getElement('#test')).toBeDefined();
    });
  });

  describe('addClass', () => {
    it('adds class to element', () => {
      const el = document.getElementById('test')!;
      addClass(el, 'new-class');
      expect(el.classList.contains('new-class')).toBe(true);
    });
  });

  describe('removeClass', () => {
    it('removes class from element', () => {
      const el = document.getElementById('test')!;
      removeClass(el, 'initial');
      expect(el.classList.contains('initial')).toBe(false);
    });
  });

  describe('toggleClass', () => {
    it('toggles class on element', () => {
      const el = document.getElementById('test')!;
      toggleClass(el, 'toggled');
      expect(el.classList.contains('toggled')).toBe(true);
      toggleClass(el, 'toggled');
      expect(el.classList.contains('toggled')).toBe(false);
    });
  });

  describe('hasClass', () => {
    it('checks if element has class', () => {
      const el = document.getElementById('test')!;
      expect(hasClass(el, 'initial')).toBe(true);
    });
  });
});
