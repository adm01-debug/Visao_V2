import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isFocusable,
  getFocusableElements,
  getContrastRatio,
  meetsContrastAA,
  meetsContrastAAA,
  generateA11yId,
} from '../accessibility';

describe('accessibility', () => {
  describe('isFocusable', () => {
    it('should return true for buttons', () => {
      const button = document.createElement('button');
      expect(isFocusable(button)).toBe(true);
    });

    it('should return false for disabled buttons', () => {
      const button = document.createElement('button');
      button.disabled = true;
      expect(isFocusable(button)).toBe(false);
    });

    it('should return true for links with href', () => {
      const link = document.createElement('a');
      link.href = '#';
      expect(isFocusable(link)).toBe(true);
    });

    it('should return false for div without tabindex', () => {
      const div = document.createElement('div');
      expect(isFocusable(div)).toBe(false);
    });

    it('should return true for div with tabindex', () => {
      const div = document.createElement('div');
      div.tabIndex = 0;
      expect(isFocusable(div)).toBe(true);
    });
  });

  describe('getFocusableElements', () => {
    it('should return all focusable elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button 1</button>
        <input type="text" />
        <a href="#">Link</a>
        <div>Not focusable</div>
      `;
      
      const elements = getFocusableElements(container);
      expect(elements.length).toBe(3);
    });
  });

  describe('getContrastRatio', () => {
    it('should return 21 for black on white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should return 1 for same colors', () => {
      const ratio = getContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBeCloseTo(1, 0);
    });
  });

  describe('meetsContrastAA', () => {
    it('should pass for high contrast', () => {
      expect(meetsContrastAA('#000000', '#ffffff')).toBe(true);
    });

    it('should fail for low contrast', () => {
      expect(meetsContrastAA('#cccccc', '#ffffff')).toBe(false);
    });
  });

  describe('meetsContrastAAA', () => {
    it('should pass for very high contrast', () => {
      expect(meetsContrastAAA('#000000', '#ffffff')).toBe(true);
    });
  });

  describe('generateA11yId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateA11yId('test');
      const id2 = generateA11yId('test');
      expect(id1).not.toBe(id2);
    });

    it('should include prefix', () => {
      const id = generateA11yId('button');
      expect(id.startsWith('button-')).toBe(true);
    });
  });
});
