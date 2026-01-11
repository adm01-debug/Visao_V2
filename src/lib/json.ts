/**
 * JSON utilities
 */

export function parse<T>(json: string): T | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function stringify(data: unknown, pretty = false): string {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

export function isValid(json: string): boolean {
  return parse(json) !== null;
}

export function merge<T extends object>(...objects: T[]): T {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {} as T);
}

export default { parse, stringify, isValid, merge };

