import { describe, it, expect } from 'vitest';
import { safeJsonParse, safeJsonStringify, isValidJson, prettify } from '../json';

describe('json utilities', () => {
  describe('safeJsonParse', () => {
    it('parses valid JSON', () => {
      expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    });
    it('returns default for invalid JSON', () => {
      expect(safeJsonParse('invalid', {})).toEqual({});
    });
  });

  describe('safeJsonStringify', () => {
    it('stringifies object', () => {
      expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
    });
    it('handles circular references', () => {
      const obj: any = {};
      obj.self = obj;
      expect(safeJsonStringify(obj)).toBeDefined();
    });
  });

  describe('isValidJson', () => {
    it('validates JSON string', () => {
      expect(isValidJson('{"a":1}')).toBe(true);
      expect(isValidJson('invalid')).toBe(false);
    });
  });

  describe('prettify', () => {
    it('formats JSON with indentation', () => {
      expect(prettify({ a: 1 })).toContain('\n');
    });
  });
});
