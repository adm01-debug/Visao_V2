import { describe, it, expect } from 'vitest';
import { generateUUID, isValidUUID, parseUUID, generateShortId } from '../uuid';

describe('uuid utilities', () => {
  describe('generateUUID', () => {
    it('generates valid UUID', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('generates unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('isValidUUID', () => {
    it('validates UUID format', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('invalid')).toBe(false);
    });
  });

  describe('parseUUID', () => {
    it('parses UUID components', () => {
      const parsed = parseUUID('550e8400-e29b-41d4-a716-446655440000');
      expect(parsed).toBeDefined();
    });
  });

  describe('generateShortId', () => {
    it('generates short ID', () => {
      const id = generateShortId();
      expect(id.length).toBeLessThan(36);
    });
  });
});
