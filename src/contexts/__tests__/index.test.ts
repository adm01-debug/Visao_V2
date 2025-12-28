// src/contexts/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import * as contextsExports from '../index';

describe('contexts/index exports', () => {
  it('deve exportar módulos definidos', () => {
    expect(contextsExports).toBeDefined();
    expect(typeof contextsExports).toBe('object');
  });

  it('não deve ter exports undefined', () => {
    Object.entries(contextsExports).forEach(([key, value]) => {
      expect(value, `Export ${key}`).not.toBeUndefined();
    });
  });

  it('deve exportar contexts React', () => {
    const keys = Object.keys(contextsExports);
    expect(keys.length).toBeGreaterThan(0);
  });
});
