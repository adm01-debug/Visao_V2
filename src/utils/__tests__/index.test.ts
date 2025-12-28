// src/utils/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import * as utilsExports from '../index';

describe('utils/index exports', () => {
  it('deve exportar módulos definidos', () => {
    expect(utilsExports).toBeDefined();
    expect(typeof utilsExports).toBe('object');
  });

  it('não deve ter exports undefined', () => {
    Object.entries(utilsExports).forEach(([key, value]) => {
      expect(value, `Export ${key}`).not.toBeUndefined();
    });
  });

  it('deve ter exports esperados', () => {
    const keys = Object.keys(utilsExports);
    expect(keys.length).toBeGreaterThan(0);
  });
});
