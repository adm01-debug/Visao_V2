/**
 * Cache Utilities - VISÃO
 * Gerenciamento de cache em memória e localStorage com suporte a TTL (Time To Live).
 */

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache em memória (Volátil)
 */
const memoryCache = new Map<string, CacheItem<any>>();

/**
 * Define um valor no cache
 */
export function setCache<T>(key: string, value: T, ttlMs: number = 300000, storage: 'memory' | 'local' = 'memory'): void {
  const expiresAt = Date.now() + ttlMs;
  const item: CacheItem<T> = { value, expiresAt };

  if (storage === 'memory') {
    memoryCache.set(key, item);
  } else {
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.warn('[Cache] Erro ao salvar no localStorage:', e);
    }
  }
}

/**
 * Obtém um valor do cache
 */
export function getCache<T>(key: string, storage: 'memory' | 'local' = 'memory'): T | null {
  let item: CacheItem<T> | undefined;

  if (storage === 'memory') {
    item = memoryCache.get(key);
  } else {
    try {
      const saved = localStorage.getItem(key);
      if (saved) item = JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }

  if (!item) return null;

  // Verifica expiração
  if (Date.now() > item.expiresAt) {
    if (storage === 'memory') {
      memoryCache.delete(key);
    } else {
      localStorage.removeItem(key);
    }
    return null;
  }

  return item.value;
}

/**
 * Limpa uma chave do cache
 */
export function clearCache(key: string): void {
  memoryCache.delete(key);
  localStorage.removeItem(key);
}

/**
 * Limpa todo o cache em memória
 */
export function clearAllMemoryCache(): void {
  memoryCache.clear();
}

export default {
  setCache,
  getCache,
  clearCache,
  clearAllMemoryCache,
};
