/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: diff
 * 
 * Comparação de objetos, arrays e texto
 */

export type DiffType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffResult<T = unknown> {
  type: DiffType;
  path: string;
  oldValue?: T;
  newValue?: T;
}

export interface TextDiffResult {
  type: DiffType;
  line: number;
  content: string;
}

/**
 * Compara dois objetos e retorna as diferenças
 */
export function diffObjects<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: T,
  path = ''
): DiffResult[] {
  const diffs: DiffResult[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    if (!(key in oldObj)) {
      diffs.push({ type: 'added', path: currentPath, newValue });
    } else if (!(key in newObj)) {
      diffs.push({ type: 'removed', path: currentPath, oldValue });
    } else if (isObject(oldValue) && isObject(newValue)) {
      diffs.push(...diffObjects(oldValue as Record<string, unknown>, newValue as Record<string, unknown>, currentPath));
    } else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      diffs.push(...diffArrays(oldValue, newValue, currentPath));
    } else if (!deepEqual(oldValue, newValue)) {
      diffs.push({ type: 'changed', path: currentPath, oldValue, newValue });
    }
  }

  return diffs;
}

/**
 * Compara dois arrays e retorna as diferenças
 */
export function diffArrays<T>(
  oldArr: T[],
  newArr: T[],
  path = ''
): DiffResult[] {
  const diffs: DiffResult[] = [];
  const maxLength = Math.max(oldArr.length, newArr.length);

  for (let i = 0; i < maxLength; i++) {
    const currentPath = `${path}[${i}]`;
    
    if (i >= oldArr.length) {
      diffs.push({ type: 'added', path: currentPath, newValue: newArr[i] });
    } else if (i >= newArr.length) {
      diffs.push({ type: 'removed', path: currentPath, oldValue: oldArr[i] });
    } else if (isObject(oldArr[i]) && isObject(newArr[i])) {
      diffs.push(...diffObjects(oldArr[i] as Record<string, unknown>, newArr[i] as Record<string, unknown>, currentPath));
    } else if (!deepEqual(oldArr[i], newArr[i])) {
      diffs.push({ type: 'changed', path: currentPath, oldValue: oldArr[i], newValue: newArr[i] });
    }
  }

  return diffs;
}

/**
 * Compara duas strings linha a linha
 */
export function diffText(oldText: string, newText: string): TextDiffResult[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diffs: TextDiffResult[] = [];

  const lcs = longestCommonSubsequence(oldLines, newLines);
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && oldLines[oldIndex] === lcs[lcsIndex] && newLines[newIndex] === lcs[lcsIndex]) {
      diffs.push({ type: 'unchanged', line: newIndex + 1, content: newLines[newIndex] });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (newIndex < newLines.length && (lcsIndex >= lcs.length || newLines[newIndex] !== lcs[lcsIndex])) {
      diffs.push({ type: 'added', line: newIndex + 1, content: newLines[newIndex] });
      newIndex++;
    } else if (oldIndex < oldLines.length) {
      diffs.push({ type: 'removed', line: oldIndex + 1, content: oldLines[oldIndex] });
      oldIndex++;
    }
  }

  return diffs;
}

/**
 * Encontra a maior subsequência comum
 */
function longestCommonSubsequence<T>(arr1: T[], arr2: T[]): T[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (deepEqual(arr1[i - 1], arr2[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: T[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (deepEqual(arr1[i - 1], arr2[j - 1])) {
      result.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * Verifica se um valor é um objeto
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Comparação profunda de valores
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Aplica diferenças a um objeto
 */
export function applyDiff<T extends Record<string, unknown>>(obj: T, diffs: DiffResult[]): T {
  const result = JSON.parse(JSON.stringify(obj)) as T;
  
  for (const diff of diffs) {
    const parts = diff.path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current: unknown = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = (current as Record<string, unknown>)[parts[i]];
    }

    const lastKey = parts[parts.length - 1];
    
    if (diff.type === 'added' || diff.type === 'changed') {
      (current as Record<string, unknown>)[lastKey] = diff.newValue;
    } else if (diff.type === 'removed') {
      delete (current as Record<string, unknown>)[lastKey];
    }
  }

  return result;
}

/**
 * Gera patch JSON-Patch (RFC 6902)
 */
export function generateJsonPatch(diffs: DiffResult[]): object[] {
  return diffs.map(diff => {
    const path = '/' + diff.path.replace(/\./g, '/').replace(/\[(\d+)\]/g, '/$1');
    
    switch (diff.type) {
      case 'added':
        return { op: 'add', path, value: diff.newValue };
      case 'removed':
        return { op: 'remove', path };
      case 'changed':
        return { op: 'replace', path, value: diff.newValue };
      default:
        return null;
    }
  }).filter(Boolean);
}

export default {
  diffObjects,
  diffArrays,
  diffText,
  deepEqual,
  applyDiff,
  generateJsonPatch,
};
