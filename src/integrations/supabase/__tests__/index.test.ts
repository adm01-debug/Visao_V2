// src/integrations/supabase/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import * as supabaseExports from '../index';

describe('supabase/index exports', () => {
  it('deve exportar supabase client', () => {
    expect(supabaseExports).toBeDefined();
  });

  it('deve ter exports esperados', () => {
    const keys = Object.keys(supabaseExports);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('não deve ter exports undefined', () => {
    Object.entries(supabaseExports).forEach(([key, value]) => {
      expect(value, `Export ${key}`).not.toBeUndefined();
    });
  });
});
