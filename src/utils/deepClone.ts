export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (obj instanceof Object) {
    const copy = {} as T;
    Object.keys(obj).forEach(key => {
      (copy as Record<string, unknown>)[key] = deepClone((obj as Record<string, unknown>)[key]);
    });
    return copy;
  }
  return obj;
}
export default deepClone;
