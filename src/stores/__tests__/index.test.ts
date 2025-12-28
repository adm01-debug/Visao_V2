// src/stores/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import * as storesExports from '../index';

describe('stores/index exports', () => {
  it('deve exportar módulos definidos', () => {
    expect(storesExports).toBeDefined();
    expect(typeof storesExports).toBe('object');
  });

  it('não deve ter exports undefined', () => {
    Object.entries(storesExports).forEach(([key, value]) => {
      expect(value, `Export ${key}`).not.toBeUndefined();
    });
  });

  it('deve exportar stores Zustand', () => {
    const keys = Object.keys(storesExports);
    expect(keys.length).toBeGreaterThan(0);
  });
});
