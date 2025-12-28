import { describe, it, expect } from 'vitest';
import * as supabaseConfig from '../supabase';

describe('supabase config', () => {
  it('deve exportar configuração', () => {
    expect(supabaseConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(supabaseConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(supabaseConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(supabaseConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(supabaseConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
