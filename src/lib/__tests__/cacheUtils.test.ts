import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setCache, getCache, clearCache, clearAllMemoryCache } from '../cacheUtils';

describe('cacheUtils', () => {
  beforeEach(() => {
    clearAllMemoryCache();
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('deve salvar e recuperar dados da memória', () => {
    setCache('test-key', { foo: 'bar' }, 1000, 'memory');
    const result = getCache<{ foo: string }>('test-key', 'memory');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('deve salvar e recuperar dados do localStorage', () => {
    setCache('local-key', 'value', 1000, 'local');
    const result = getCache<string>('local-key', 'local');
    expect(result).toBe('value');
  });

  it('deve expirar dados após o TTL', () => {
    setCache('expire-key', 'expiring', 1000, 'memory');

    // Avança o tempo
    vi.advanceTimersByTime(1500);

    const result = getCache<string>('expire-key', 'memory');
    expect(result).toBeNull();
  });

  it('deve remover itens manualmente', () => {
    setCache('remove-key', 'value', 1000, 'memory');
    clearCache('remove-key');
    expect(getCache('remove-key', 'memory')).toBeNull();
  });

  it('deve retornar null para chaves inexistentes', () => {
    expect(getCache('non-existent')).toBeNull();
  });
});
