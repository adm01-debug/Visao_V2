import { describe, it, expect } from 'vitest';
import { getConfig, setConfig, mergeConfig, validateConfig } from '../config';

describe('config utilities', () => {
  describe('getConfig', () => {
    it('gets config value', () => {
      setConfig('test', 'value');
      expect(getConfig('test')).toBe('value');
    });
    it('returns default for missing key', () => {
      expect(getConfig('missing', 'default')).toBe('default');
    });
  });

  describe('setConfig', () => {
    it('sets config value', () => {
      setConfig('key', 'value');
      expect(getConfig('key')).toBe('value');
    });
  });

  describe('mergeConfig', () => {
    it('merges config objects', () => {
      const base = { a: 1, b: 2 };
      const override = { b: 3, c: 4 };
      expect(mergeConfig(base, override)).toEqual({ a: 1, b: 3, c: 4 });
    });
  });

  describe('validateConfig', () => {
    it('validates required fields', () => {
      const config = { required: 'value' };
      const schema = { required: true };
      expect(validateConfig(config, schema)).toBe(true);
    });
  });
});
