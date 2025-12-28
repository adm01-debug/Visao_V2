import { describe, it, expect } from 'vitest';
import * as constants from '../index';

describe('constants/index exports', () => {
  it('deve exportar módulos', () => {
    expect(constants).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(constants).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter quantidade de exports esperada', () => {
    expect(Object.keys(constants).length).toBeGreaterThan(0);
  });
});
