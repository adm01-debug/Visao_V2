/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Array Utilities - Funções utilitárias para arrays
 * 
 * @module utils/array
 */

// ============================================
// TIPOS
// ============================================

type SortOrder = 'asc' | 'desc';
type ComparableValue = string | number | boolean | Date;

// ============================================
// FUNÇÕES DE TRANSFORMAÇÃO
// ============================================

/**
 * Dividir array em chunks de tamanho fixo
 * @param arr Array original
 * @param size Tamanho de cada chunk
 */
export const chunk = <T>(arr: T[], size: number): T[][] => {
  if (size <= 0) throw new Error('Chunk size must be positive');
  return Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size)
  );
};

/**
 * Remover duplicatas (valores primitivos)
 * @param arr Array com possíveis duplicatas
 */
export const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

/**
 * Remover duplicatas por chave
 * @param arr Array de objetos
 * @param key Função que retorna chave única
 */
export const uniqueBy = <T, K>(arr: T[], key: (item: T) => K): T[] => {
  const map = new Map<K, T>();
  arr.forEach((item) => {
    const k = key(item);
    if (!map.has(k)) {
      map.set(k, item);
    }
  });
  return [...map.values()];
};

/**
 * Agrupar por chave
 * @param arr Array de objetos
 * @param key Função que retorna chave de agrupamento
 */
export const groupBy = <T, K extends string | number>(
  arr: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) {
      acc[k] = [];
    }
    acc[k].push(item);
    return acc;
  }, {} as Record<K, T[]>);
};

/**
 * Ordenar por chave
 * @param arr Array a ser ordenado
 * @param key Propriedade ou função extratora
 * @param order Ordem: 'asc' ou 'desc'
 */
export const sortBy = <T>(
  arr: T[],
  key: keyof T | ((item: T) => ComparableValue),
  order: SortOrder = 'asc'
): T[] => {
  const getValue = (item: T): ComparableValue => {
    if (typeof key === 'function') {
      return key(item);
    }
    return item[key] as ComparableValue;
  };
  
  return [...arr].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    
    if (va < vb) return order === 'asc' ? -1 : 1;
    if (va > vb) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Embaralhar array (Fisher-Yates)
 * @param arr Array a ser embaralhado
 */
export const shuffle = <T>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// ============================================
// FUNÇÕES DE ACESSO
// ============================================

/**
 * Obter primeiro elemento
 */
export const first = <T>(arr: T[]): T | undefined => arr[0];

/**
 * Obter último elemento
 */
export const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

/**
 * Obter elemento em índice (suporta negativo)
 */
export const at = <T>(arr: T[], index: number): T | undefined => {
  if (index < 0) {
    return arr[arr.length + index];
  }
  return arr[index];
};

// ============================================
// FUNÇÕES DE FILTRAGEM
// ============================================

/**
 * Remover valores null/undefined
 */
export const compact = <T>(arr: (T | null | undefined)[]): T[] => {
  return arr.filter((x): x is T => x != null);
};

/**
 * Remover valores falsy
 */
export const truthy = <T>(arr: (T | null | undefined | false | 0 | '')[]): T[] => {
  return arr.filter((x): x is T => Boolean(x));
};

/**
 * Diferença entre arrays
 */
export const difference = <T>(arr1: T[], arr2: T[]): T[] => {
  const set2 = new Set(arr2);
  return arr1.filter((x) => !set2.has(x));
};

/**
 * Interseção entre arrays
 */
export const intersection = <T>(arr1: T[], arr2: T[]): T[] => {
  const set2 = new Set(arr2);
  return arr1.filter((x) => set2.has(x));
};

// ============================================
// FUNÇÕES DE GERAÇÃO
// ============================================

/**
 * Gerar range de números
 * @param start Início (inclusivo)
 * @param end Fim (exclusivo)
 * @param step Passo
 */
export const range = (start: number, end: number, step = 1): number[] => {
  if (step === 0) throw new Error('Step cannot be zero');
  const length = Math.max(Math.ceil((end - start) / step), 0);
  return Array.from({ length }, (_, i) => start + i * step);
};

/**
 * Gerar array de tamanho fixo com valor
 */
export const fill = <T>(length: number, value: T | ((index: number) => T)): T[] => {
  return Array.from({ length }, (_, i) => 
    typeof value === 'function' ? (value as (index: number) => T)(i) : value
  );
};

// ============================================
// FUNÇÕES DE REDUÇÃO
// ============================================

/**
 * Soma de números
 */
export const sum = (arr: number[]): number => {
  return arr.reduce((acc, val) => acc + val, 0);
};

/**
 * Média de números
 */
export const average = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
};

/**
 * Mínimo
 */
export const min = (arr: number[]): number | undefined => {
  if (arr.length === 0) return undefined;
  return Math.min(...arr);
};

/**
 * Máximo
 */
export const max = (arr: number[]): number | undefined => {
  if (arr.length === 0) return undefined;
  return Math.max(...arr);
};

/**
 * Contar ocorrências
 */
export const countBy = <T, K extends string | number>(
  arr: T[],
  key: (item: T) => K
): Record<K, number> => {
  return arr.reduce((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<K, number>);
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  chunk,
  unique,
  uniqueBy,
  groupBy,
  sortBy,
  shuffle,
  first,
  last,
  at,
  compact,
  truthy,
  difference,
  intersection,
  range,
  fill,
  sum,
  average,
  min,
  max,
  countBy,
};
