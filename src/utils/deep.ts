/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Deep Utils - Operações profundas em objetos
 * 
 * @module utils/deep
 */

// ============================================
// TIPOS
// ============================================

type Primitive = string | number | boolean | null | undefined | symbol | bigint;

type DeepPartial<T> = T extends Primitive
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : unknown
  : P extends keyof T
    ? T[P]
    : unknown;

// ============================================
// FUNÇÕES
// ============================================

/**
 * Clonar objeto profundamente
 * @param obj Objeto a ser clonado
 * @returns Clone profundo do objeto
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
};

/**
 * Mesclar objetos profundamente
 * @param target Objeto alvo
 * @param sources Objetos fonte
 * @returns Objeto mesclado
 */
export const deepMerge = <T extends Record<string, unknown>>(
  target: T,
  ...sources: DeepPartial<T>[]
): T => {
  if (!sources.length) return target;
  
  const source = sources.shift();
  if (source === undefined) return target;
  
  const result = deepClone(target);
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key as keyof typeof source];
      const targetValue = result[key as keyof T];
      
      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as DeepPartial<Record<string, unknown>>
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }
  
  return deepMerge(result, ...sources);
};

/**
 * Comparar objetos profundamente
 * @param a Primeiro valor
 * @param b Segundo valor
 * @returns True se são iguais
 */
export const deepEqual = <T>(a: T, b: T): boolean => {
  if (a === b) return true;
  
  if (typeof a !== typeof b) return false;
  
  if (a === null || b === null) return a === b;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
};

/**
 * Obter valor em caminho profundo
 * @param obj Objeto fonte
 * @param path Caminho separado por pontos
 * @param defaultValue Valor padrão se não encontrado
 * @returns Valor encontrado ou padrão
 */
export const deepGet = <T, P extends string, D = undefined>(
  obj: T,
  path: P,
  defaultValue?: D
): PathValue<T, P> | D => {
  const keys = path.split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue as D;
    }
    result = (result as Record<string, unknown>)[key];
  }
  
  return (result === undefined ? defaultValue : result) as PathValue<T, P> | D;
};

/**
 * Definir valor em caminho profundo
 * @param obj Objeto alvo
 * @param path Caminho separado por pontos
 * @param value Valor a definir
 * @returns Clone do objeto com valor definido
 */
export const deepSet = <T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T => {
  const clone = deepClone(obj);
  const keys = path.split('.');
  let current: Record<string, unknown> = clone;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
  return clone;
};

/**
 * Remover valor em caminho profundo
 * @param obj Objeto alvo
 * @param path Caminho separado por pontos
 * @returns Clone do objeto sem o valor
 */
export const deepUnset = <T extends Record<string, unknown>>(
  obj: T,
  path: string
): T => {
  const clone = deepClone(obj);
  const keys = path.split('.');
  let current: Record<string, unknown> = clone;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) return clone;
    current = current[key] as Record<string, unknown>;
  }
  
  delete current[keys[keys.length - 1]];
  return clone;
};

/**
 * Verificar se objeto tem caminho
 * @param obj Objeto fonte
 * @param path Caminho separado por pontos
 * @returns True se caminho existe
 */
export const deepHas = <T>(obj: T, path: string): boolean => {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return false;
    if (!Object.prototype.hasOwnProperty.call(current, key)) return false;
    current = (current as Record<string, unknown>)[key];
  }
  
  return true;
};

/**
 * Achatar objeto em chaves com caminho
 * @param obj Objeto fonte
 * @param prefix Prefixo para chaves
 * @returns Objeto achatado
 */
export const deepFlatten = <T extends Record<string, unknown>>(
  obj: T,
  prefix = ''
): Record<string, Primitive> => {
  const result: Record<string, Primitive> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(
          result,
          deepFlatten(value as Record<string, unknown>, newKey)
        );
      } else {
        result[newKey] = value as Primitive;
      }
    }
  }
  
  return result;
};

export default {
  clone: deepClone,
  merge: deepMerge,
  equal: deepEqual,
  get: deepGet,
  set: deepSet,
  unset: deepUnset,
  has: deepHas,
  flatten: deepFlatten,
};
