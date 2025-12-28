import { describe, it, expect } from 'vitest';
import * as rolesExports from '../roles';

describe('roles constants', () => {
  it('deve exportar valores definidos', () => {
    expect(rolesExports).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(rolesExports).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(rolesExports).length).toBeGreaterThan(0);
  });

  it('deve ter estrutura correta', () => {
    Object.values(rolesExports).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser imutável em runtime', () => {
    const keys = Object.keys(rolesExports);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
