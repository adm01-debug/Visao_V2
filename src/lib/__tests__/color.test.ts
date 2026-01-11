import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, lighten, darken, isValidHex, getContrastColor } from '../color';

describe('color utilities', () => {
  describe('hexToRgb', () => {
    it('converts hex to RGB', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });
  });

  describe('rgbToHex', () => {
    it('converts RGB to hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    });
  });

  describe('lighten', () => {
    it('lightens color', () => {
      const result = lighten('#000000', 50);
      expect(result).not.toBe('#000000');
    });
  });

  describe('darken', () => {
    it('darkens color', () => {
      const result = darken('#ffffff', 50);
      expect(result).not.toBe('#ffffff');
    });
  });

  describe('isValidHex', () => {
    it('validates hex color', () => {
      expect(isValidHex('#ff0000')).toBe(true);
      expect(isValidHex('invalid')).toBe(false);
    });
  });

  describe('getContrastColor', () => {
    it('returns contrasting color', () => {
      expect(getContrastColor('#000000')).toBe('#ffffff');
      expect(getContrastColor('#ffffff')).toBe('#000000');
    });
  });
});
