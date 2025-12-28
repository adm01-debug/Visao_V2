// src/lib/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import * as libExports from '../index';

describe('lib/index exports', () => {
  it('deve exportar módulos definidos', () => {
    expect(libExports).toBeDefined();
    expect(typeof libExports).toBe('object');
  });

  it('não deve ter exports undefined', () => {
    Object.entries(libExports).forEach(([key, value]) => {
      expect(value, `Export ${key} não deve ser undefined`).not.toBeUndefined();
    });
  });

  it('deve ter exports esperados', () => {
    const keys = Object.keys(libExports);
    expect(keys.length).toBeGreaterThan(0);
  });
});
