/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Diff Utilities - Comparação de objetos e arrays
 * 
 * @module utils/diff
 */

// ============================================
// TIPOS
// ============================================

export interface ArrayDiff<T> {
  added: T[];
  removed: T[];
  unchanged: T[];
}

export interface TextDiffEntry {
  type: 'add' | 'remove' | 'equal';
  value: string;
  lineNumber?: number;
}

export interface ObjectDiffEntry<T> {
  key: string;
  oldValue: T;
  newValue: T;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
}

// ============================================
// DIFF DE OBJETOS
// ============================================

/**
 * Comparar dois objetos e retornar diferenças
 * @param a Objeto original
 * @param b Objeto atualizado
 */
export function diffObjects<T extends Record<string, unknown>>(
  a: T,
  b: T
): Partial<T> {
  const diff: Partial<T> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  
  keys.forEach((key) => {
    const oldValue = a[key as keyof T];
    const newValue = b[key as keyof T];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      (diff as Record<string, unknown>)[key] = newValue;
    }
  });
  
  return diff;
}

/**
 * Comparar dois objetos e retornar detalhes das diferenças
 * @param a Objeto original
 * @param b Objeto atualizado
 */
export function diffObjectsDetailed<T extends Record<string, unknown>>(
  a: T,
  b: T
): ObjectDiffEntry<unknown>[] {
  const entries: ObjectDiffEntry<unknown>[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  
  allKeys.forEach((key) => {
    const oldValue = a[key as keyof T];
    const newValue = b[key as keyof T];
    const oldExists = key in a;
    const newExists = key in b;
    
    if (!oldExists && newExists) {
      entries.push({
        key,
        oldValue: undefined,
        newValue,
        type: 'added',
      });
    } else if (oldExists && !newExists) {
      entries.push({
        key,
        oldValue,
        newValue: undefined,
        type: 'removed',
      });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      entries.push({
        key,
        oldValue,
        newValue,
        type: 'changed',
      });
    }
  });
  
  return entries;
}

// ============================================
// DIFF DE ARRAYS
// ============================================

/**
 * Comparar dois arrays e retornar elementos adicionados/removidos
 * @param a Array original
 * @param b Array atualizado
 */
export function diffArrays<T>(a: T[], b: T[]): ArrayDiff<T> {
  const setA = new Set(a);
  const setB = new Set(b);
  
  const added = b.filter((x) => !setA.has(x));
  const removed = a.filter((x) => !setB.has(x));
  const unchanged = a.filter((x) => setB.has(x));
  
  return { added, removed, unchanged };
}

/**
 * Comparar arrays por chave
 * @param a Array original
 * @param b Array atualizado
 * @param keyFn Função para extrair chave única
 */
export function diffArraysBy<T, K>(
  a: T[],
  b: T[],
  keyFn: (item: T) => K
): ArrayDiff<T> {
  const mapA = new Map(a.map((item) => [keyFn(item), item]));
  const mapB = new Map(b.map((item) => [keyFn(item), item]));
  
  const added: T[] = [];
  const removed: T[] = [];
  const unchanged: T[] = [];
  
  b.forEach((item) => {
    const key = keyFn(item);
    if (!mapA.has(key)) {
      added.push(item);
    } else {
      unchanged.push(item);
    }
  });
  
  a.forEach((item) => {
    const key = keyFn(item);
    if (!mapB.has(key)) {
      removed.push(item);
    }
  });
  
  return { added, removed, unchanged };
}

// ============================================
// DIFF DE TEXTO
// ============================================

/**
 * Comparar duas strings linha a linha
 * @param a Texto original
 * @param b Texto atualizado
 */
export function diffText(a: string, b: string): TextDiffEntry[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const result: TextDiffEntry[] = [];
  
  const maxLines = Math.max(aLines.length, bLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const aLine = aLines[i];
    const bLine = bLines[i];
    
    if (aLine === undefined) {
      result.push({
        type: 'add',
        value: bLine,
        lineNumber: i + 1,
      });
    } else if (bLine === undefined) {
      result.push({
        type: 'remove',
        value: aLine,
        lineNumber: i + 1,
      });
    } else if (aLine === bLine) {
      result.push({
        type: 'equal',
        value: bLine,
        lineNumber: i + 1,
      });
    } else {
      result.push({
        type: 'remove',
        value: aLine,
        lineNumber: i + 1,
      });
      result.push({
        type: 'add',
        value: bLine,
        lineNumber: i + 1,
      });
    }
  }
  
  return result;
}

/**
 * Aplicar diff a um objeto
 * @param original Objeto original
 * @param diff Diferenças a aplicar
 */
export function applyDiff<T extends Record<string, unknown>>(
  original: T,
  diff: Partial<T>
): T {
  return { ...original, ...diff };
}

/**
 * Verificar se dois valores são iguais (deep)
 */
export function isEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  diffObjects,
  diffObjectsDetailed,
  diffArrays,
  diffArraysBy,
  diffText,
  applyDiff,
  isEqual,
};
