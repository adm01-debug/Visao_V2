/**
 * Object utilities
 */

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

export function merge<T extends object>(...objects: Partial<T>[]): T {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {} as T);
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

export default { pick, omit, merge, clone, isEmpty };

