/**
 * Object Utilities
 */

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isEmptyObject = (obj: object): boolean => 
  Object.keys(obj).length === 0;

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> =>
  keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {} as Pick<T, K>);

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as K))) as Omit<T, K>;

export const get = (obj: unknown, path: string, defaultValue?: unknown): unknown => {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let result = obj;
  for (const key of keys) {
    result = (result as Record<string, unknown>)?.[key];
    if (result === undefined) return defaultValue;
  }
  return result;
};

export const set = <T extends object>(obj: T, path: string, value: unknown): T => {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as object) };
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return result;
};

export const merge = <T extends object>(...objects: Partial<T>[]): T =>
  objects.reduce((acc, obj) => {
    Object.entries(obj).forEach(([key, value]) => {
      if (isObject(value) && isObject((acc as Record<string, unknown>)[key])) {
        (acc as Record<string, unknown>)[key] = merge((acc as Record<string, unknown>)[key] as object, value);
      } else {
        (acc as Record<string, unknown>)[key] = value;
      }
    });
    return acc;
  }, {} as T) as T;

export const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const equals = (a: unknown, b: unknown): boolean => 
  JSON.stringify(a) === JSON.stringify(b);

export const keys = <T extends object>(obj: T): (keyof T)[] => 
  Object.keys(obj) as (keyof T)[];

export const values = <T extends object>(obj: T): T[keyof T][] => 
  Object.values(obj) as T[keyof T][];

export const entries = <T extends object>(obj: T): [keyof T, T[keyof T]][] => 
  Object.entries(obj) as [keyof T, T[keyof T]][];

export const fromEntries = <K extends string, V>(entries: [K, V][]): Record<K, V> =>
  Object.fromEntries(entries) as Record<K, V>;

export const mapValues = <T extends object, U>(obj: T, fn: (value: T[keyof T], key: keyof T) => U): Record<keyof T, U> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v as T[keyof T], k as keyof T)])) as Record<keyof T, U>;

export const filterObject = <T extends object>(obj: T, fn: (value: T[keyof T], key: keyof T) => boolean): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(v as T[keyof T], k as keyof T))) as Partial<T>;
