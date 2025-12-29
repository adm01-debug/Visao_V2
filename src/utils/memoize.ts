/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Memoize Utility - Cache de resultados de funções
 * 
 * @module utils/memoize
 */

// ============================================
// TIPOS
// ============================================

type AnyFunction = (...args: never[]) => unknown;

interface MemoizeOptions {
  /** Tamanho máximo do cache */
  maxSize?: number;
  /** Tempo de vida em ms (0 = infinito) */
  ttl?: number;
  /** Função para gerar chave de cache */
  keyGenerator?: (...args: unknown[]) => string;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

interface MemoizedFunction<T extends AnyFunction> {
  (...args: Parameters<T>): ReturnType<T>;
  /** Limpar todo o cache */
  clear: () => void;
  /** Deletar entrada específica */
  delete: (...args: Parameters<T>) => boolean;
  /** Verificar se existe no cache */
  has: (...args: Parameters<T>) => boolean;
  /** Obter tamanho atual do cache */
  size: () => number;
}

// ============================================
// FUNÇÕES
// ============================================

/**
 * Memoize - Cache de resultados de funções puras
 * @param fn Função a ser memoizada
 * @param options Opções de configuração
 * @returns Função memoizada
 */
export function memoize<T extends AnyFunction>(
  fn: T,
  options: MemoizeOptions = {}
): MemoizedFunction<T> {
  const {
    maxSize = 100,
    ttl = 0,
    keyGenerator = (...args: unknown[]) => JSON.stringify(args),
  } = options;
  
  const cache = new Map<string, CacheEntry<ReturnType<T>>>();
  
  const isExpired = (entry: CacheEntry<ReturnType<T>>): boolean => {
    if (ttl === 0) return false;
    return Date.now() - entry.timestamp >= ttl;
  };
  
  const evictOldest = (): void => {
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value as string;
      cache.delete(firstKey);
    }
  };
  
  const getKey = (args: Parameters<T>): string => {
    return keyGenerator(...(args as unknown[]));
  };
  
  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const key = getKey(args);
    const cached = cache.get(key);
    
    if (cached && !isExpired(cached)) {
      // Move para o final (LRU)
      cache.delete(key);
      cache.set(key, cached);
      return cached.value;
    }
    
    // Executar função
    const result = fn(...args) as ReturnType<T>;
    
    // Evictar se necessário
    evictOldest();
    
    // Armazenar no cache
    cache.set(key, {
      value: result,
      timestamp: Date.now(),
    });
    
    return result;
  };
  
  memoized.clear = (): void => {
    cache.clear();
  };
  
  memoized.delete = (...args: Parameters<T>): boolean => {
    const key = getKey(args);
    return cache.delete(key);
  };
  
  memoized.has = (...args: Parameters<T>): boolean => {
    const key = getKey(args);
    const cached = cache.get(key);
    if (!cached) return false;
    if (isExpired(cached)) {
      cache.delete(key);
      return false;
    }
    return true;
  };
  
  memoized.size = (): number => cache.size;
  
  return memoized;
}

/**
 * Memoize com WeakMap (para objetos)
 * @param fn Função que recebe objeto como primeiro argumento
 * @returns Função memoizada
 */
export function memoizeWeak<T extends (obj: object, ...args: never[]) => unknown>(
  fn: T
): T {
  const cache = new WeakMap<object, ReturnType<T>>();
  
  return ((obj: object, ...args: Parameters<T> extends [object, ...infer R] ? R : never[]) => {
    if (cache.has(obj)) {
      return cache.get(obj);
    }
    
    const result = fn(obj, ...args) as ReturnType<T>;
    cache.set(obj, result);
    return result;
  }) as T;
}

/**
 * Memoize assíncrono
 * @param fn Função assíncrona a ser memoizada
 * @param options Opções de configuração
 * @returns Função memoizada
 */
export function memoizeAsync<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  options: MemoizeOptions = {}
): MemoizedFunction<T> {
  const {
    maxSize = 100,
    ttl = 0,
    keyGenerator = (...args: unknown[]) => JSON.stringify(args),
  } = options;
  
  const cache = new Map<string, CacheEntry<ReturnType<T>>>();
  const pending = new Map<string, Promise<ReturnType<T>>>();
  
  const isExpired = (entry: CacheEntry<ReturnType<T>>): boolean => {
    if (ttl === 0) return false;
    return Date.now() - entry.timestamp >= ttl;
  };
  
  const evictOldest = (): void => {
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value as string;
      cache.delete(firstKey);
    }
  };
  
  const getKey = (args: Parameters<T>): string => {
    return keyGenerator(...(args as unknown[]));
  };
  
  const memoized = (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = getKey(args);
    
    // Verificar cache
    const cached = cache.get(key);
    if (cached && !isExpired(cached)) {
      cache.delete(key);
      cache.set(key, cached);
      return cached.value;
    }
    
    // Verificar se já está em execução
    const pendingPromise = pending.get(key);
    if (pendingPromise) {
      return pendingPromise;
    }
    
    // Executar função
    const promise = fn(...args) as Promise<ReturnType<T>>;
    pending.set(key, promise);
    
    try {
      const result = await promise;
      evictOldest();
      cache.set(key, { value: result as ReturnType<T>, timestamp: Date.now() });
      return result;
    } finally {
      pending.delete(key);
    }
  }) as MemoizedFunction<T>;
  
  memoized.clear = (): void => {
    cache.clear();
  };
  
  memoized.delete = (...args: Parameters<T>): boolean => {
    const key = getKey(args);
    return cache.delete(key);
  };
  
  memoized.has = (...args: Parameters<T>): boolean => {
    const key = getKey(args);
    const cached = cache.get(key);
    if (!cached) return false;
    if (isExpired(cached)) {
      cache.delete(key);
      return false;
    }
    return true;
  };
  
  memoized.size = (): number => cache.size;
  
  return memoized;
}

export default { memoize, memoizeWeak, memoizeAsync };
