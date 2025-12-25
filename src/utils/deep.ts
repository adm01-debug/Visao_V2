export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const deepMerge = <T extends object>(target: T, ...sources: Partial<T>[]): T => {
  if (!sources.length) return target;
  const source = sources.shift();
  if (source === undefined) return target;
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = (target as any)[key];
    
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      (target as any)[key] = deepMerge(targetValue || {}, sourceValue);
    } else {
      (target as any)[key] = sourceValue;
    }
  }
  return deepMerge(target, ...sources);
};

export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => deepEqual(a[key], b[key]));
};

export const deepGet = (obj: any, path: string, defaultValue?: any): any => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) return defaultValue;
  }
  return result;
};

export const deepSet = <T extends object>(obj: T, path: string, value: any): T => {
  const clone = deepClone(obj);
  const keys = path.split('.');
  let current: any = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  return clone;
};
