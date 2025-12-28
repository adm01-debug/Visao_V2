// src/services/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import * as servicesExports from '../index';

describe('services/index exports', () => {
  it('deve exportar módulos definidos', () => {
    expect(servicesExports).toBeDefined();
    expect(typeof servicesExports).toBe('object');
  });

  it('não deve ter exports undefined', () => {
    Object.entries(servicesExports).forEach(([key, value]) => {
      expect(value, `Export ${key}`).not.toBeUndefined();
    });
  });

  it('deve exportar services', () => {
    const keys = Object.keys(servicesExports);
    expect(keys.length).toBeGreaterThan(0);
  });
});
