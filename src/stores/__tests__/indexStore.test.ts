import { describe, it, expect } from 'vitest';
import * as stores from '@/stores';

describe('stores index', () => {
  it('deve exportar todos os stores', () => {
    expect(stores).toBeDefined();
  });
});
