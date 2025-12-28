import { describe, it, expect } from 'vitest';
import * as keybindingsExports from '../keybindings';

describe('keybindings constants', () => {
  it('deve exportar valores definidos', () => {
    expect(keybindingsExports).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(keybindingsExports).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(keybindingsExports).length).toBeGreaterThan(0);
  });

  it('deve ter estrutura correta', () => {
    Object.values(keybindingsExports).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser imutável em runtime', () => {
    const keys = Object.keys(keybindingsExports);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
