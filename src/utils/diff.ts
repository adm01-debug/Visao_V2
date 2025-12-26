/**
 * Diff Utility
 */
export function diffObjects<T extends Record<string, any>>(a: T, b: T): Partial<T> {
  const diff: Partial<T> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.forEach(key => { if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) (diff as any)[key] = b[key]; });
  return diff;
}
export function diffArrays<T>(a: T[], b: T[]): { added: T[]; removed: T[]; unchanged: T[] } {
  const added = b.filter(x => !a.includes(x));
  const removed = a.filter(x => !b.includes(x));
  const unchanged = a.filter(x => b.includes(x));
  return { added, removed, unchanged };
}
export function diffText(a: string, b: string): { type: 'add' | 'remove' | 'equal'; value: string }[] {
  const aLines = a.split('\n'), bLines = b.split('\n');
  return bLines.map((line, i) => aLines[i] === line ? { type: 'equal', value: line } : { type: 'add', value: line });
}
