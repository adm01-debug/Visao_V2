import { describe, it, expect, vi } from 'vitest';
import { focusElement, trapFocus, getFocusableElements, restoreFocus } from '../focus';

describe('focus utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="container"><button id="btn1">1</button><button id="btn2">2</button></div>';
  });

  describe('focusElement', () => {
    it('focuses element', () => {
      const btn = document.getElementById('btn1')!;
      focusElement(btn);
      expect(document.activeElement).toBe(btn);
    });
  });

  describe('getFocusableElements', () => {
    it('returns focusable elements', () => {
      const container = document.getElementById('container')!;
      const elements = getFocusableElements(container);
      expect(elements).toHaveLength(2);
    });
  });
});
