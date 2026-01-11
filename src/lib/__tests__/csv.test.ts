import { describe, it, expect } from 'vitest';
import { parseCSV, toCSV, csvToJson, jsonToCSV } from '../csv';

describe('csv utilities', () => {
  describe('parseCSV', () => {
    it('parses CSV string', () => {
      const csv = 'a,b,c\n1,2,3\n4,5,6';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(['1', '2', '3']);
    });
  });

  describe('toCSV', () => {
    it('converts array to CSV', () => {
      const data = [['a', 'b'], ['1', '2']];
      expect(toCSV(data)).toBe('a,b\n1,2');
    });
  });

  describe('csvToJson', () => {
    it('converts CSV to JSON array', () => {
      const csv = 'name,age\nJohn,30\nJane,25';
      const result = csvToJson(csv);
      expect(result[0]).toEqual({ name: 'John', age: '30' });
    });
  });

  describe('jsonToCSV', () => {
    it('converts JSON array to CSV', () => {
      const json = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
      const result = jsonToCSV(json);
      expect(result).toContain('name,age');
      expect(result).toContain('John,30');
    });
  });
});
