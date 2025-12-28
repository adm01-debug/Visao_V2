// src/integrations/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import * as integrationsExports from '../index';

describe('integrations/index exports', () => {
  it('deve exportar módulos definidos', () => {
    expect(integrationsExports).toBeDefined();
    expect(typeof integrationsExports).toBe('object');
  });

  it('não deve ter exports undefined', () => {
    Object.entries(integrationsExports).forEach(([key, value]) => {
      expect(value, `Export ${key}`).not.toBeUndefined();
    });
  });

  it('deve exportar integrations', () => {
    const keys = Object.keys(integrationsExports);
    expect(keys.length).toBeGreaterThan(0);
  });
});
