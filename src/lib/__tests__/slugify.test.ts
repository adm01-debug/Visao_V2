import { describe, it, expect } from 'vitest';
import { slugify, unslugify, isValidSlug } from '../slugify';

describe('slugify', () => {
  it('should convert text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Olá Mundo!')).toBe('ola-mundo');
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });

  it('should handle special characters', () => {
    expect(slugify('São Paulo')).toBe('sao-paulo');
    expect(slugify('Café & Chá')).toBe('cafe-cha');
  });
});

describe('unslugify', () => {
  it('should convert slug to text', () => {
    expect(unslugify('hello-world')).toBe('Hello World');
  });
});

describe('isValidSlug', () => {
  it('should validate slugs', () => {
    expect(isValidSlug('valid-slug')).toBe(true);
    expect(isValidSlug('also-valid-123')).toBe(true);
    expect(isValidSlug('Invalid Slug')).toBe(false);
    expect(isValidSlug('invalid--slug')).toBe(false);
  });
});
