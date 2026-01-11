import { describe, it, expect } from 'vitest';
import { capitalize, truncate, slugify, camelCase, snakeCase, kebabCase, stripHtml } from '../string';

describe('string utilities', () => {
  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
    });
    it('does not truncate short strings', () => {
      expect(truncate('hi', 5)).toBe('hi');
    });
  });

  describe('slugify', () => {
    it('creates slug from string', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
    });
  });

  describe('camelCase', () => {
    it('converts to camelCase', () => {
      expect(camelCase('hello-world')).toBe('helloWorld');
      expect(camelCase('hello_world')).toBe('helloWorld');
    });
  });

  describe('snakeCase', () => {
    it('converts to snake_case', () => {
      expect(snakeCase('helloWorld')).toBe('hello_world');
    });
  });

  describe('kebabCase', () => {
    it('converts to kebab-case', () => {
      expect(kebabCase('helloWorld')).toBe('hello-world');
    });
  });

  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });
  });
});
