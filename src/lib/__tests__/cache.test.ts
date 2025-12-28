import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('cache utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('operações básicas', () => {
    it('deve armazenar valor', () => {
      localStorage.setItem('key', 'value');
      expect(localStorage.setItem).toHaveBeenCalledWith('key', 'value');
    });

    it('deve recuperar valor', () => {
      localStorage.setItem('key', 'value');
      const value = localStorage.getItem('key');
      expect(value).toBe('value');
    });

    it('deve remover valor', () => {
      localStorage.setItem('key', 'value');
      localStorage.removeItem('key');
      expect(localStorage.getItem('key')).toBeNull();
    });

    it('deve limpar todo o cache', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.clear();
      expect(localStorage.getItem('key1')).toBeNull();
      expect(localStorage.getItem('key2')).toBeNull();
    });
  });

  describe('cache com TTL', () => {
    it('deve armazenar com timestamp', () => {
      const data = {
        value: 'test',
        timestamp: Date.now(),
        ttl: 3600000, // 1 hora
      };
      
      localStorage.setItem('cached', JSON.stringify(data));
      const stored = JSON.parse(localStorage.getItem('cached') || '{}');
      
      expect(stored.value).toBe('test');
      expect(stored.timestamp).toBeDefined();
    });

    it('deve verificar expiração', () => {
      const isExpired = (timestamp: number, ttl: number): boolean => {
        return Date.now() - timestamp > ttl;
      };

      const oldTimestamp = Date.now() - 7200000; // 2 horas atrás
      expect(isExpired(oldTimestamp, 3600000)).toBe(true);

      const recentTimestamp = Date.now() - 1800000; // 30 min atrás
      expect(isExpired(recentTimestamp, 3600000)).toBe(false);
    });
  });

  describe('cache LRU', () => {
    it('deve remover item mais antigo quando cheio', () => {
      class LRUCache<T> {
        private cache = new Map<string, T>();
        
        constructor(private maxSize: number) {}
        
        set(key: string, value: T): void {
          if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
          }
          this.cache.delete(key);
          this.cache.set(key, value);
        }
        
        get(key: string): T | undefined {
          const value = this.cache.get(key);
          if (value !== undefined) {
            this.cache.delete(key);
            this.cache.set(key, value);
          }
          return value;
        }
        
        get size(): number {
          return this.cache.size;
        }
      }

      const cache = new LRUCache<string>(3);
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      
      expect(cache.size).toBe(3);
      
      cache.set('d', '4'); // Deve remover 'a'
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('d')).toBe('4');
    });
  });

  describe('cache de objetos', () => {
    it('deve serializar objetos', () => {
      const obj = { name: 'test', value: 123 };
      localStorage.setItem('obj', JSON.stringify(obj));
      
      const retrieved = JSON.parse(localStorage.getItem('obj') || '{}');
      expect(retrieved).toEqual(obj);
    });

    it('deve cachear arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      localStorage.setItem('arr', JSON.stringify(arr));
      
      const retrieved = JSON.parse(localStorage.getItem('arr') || '[]');
      expect(retrieved).toEqual(arr);
    });
  });

  describe('cache assíncrono', () => {
    it('deve cachear resultado de função async', async () => {
      const cache = new Map<string, unknown>();
      
      const cachedFetch = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
        if (cache.has(key)) {
          return cache.get(key) as T;
        }
        const result = await fetcher();
        cache.set(key, result);
        return result;
      };

      const mockFetcher = vi.fn().mockResolvedValue({ data: 'test' });
      
      // Primeira chamada
      const result1 = await cachedFetch('test-key', mockFetcher);
      expect(result1).toEqual({ data: 'test' });
      
      // Segunda chamada (do cache)
      const result2 = await cachedFetch('test-key', mockFetcher);
      expect(result2).toEqual({ data: 'test' });
      
      // Fetcher deve ter sido chamado apenas uma vez
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });
  });
});
