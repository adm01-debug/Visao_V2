/**
 * Config utilities
 */

interface Config {
  [key: string]: unknown;
}

let config: Config = {};

export function set(key: string, value: unknown): void {
  config[key] = value;
}

export function get<T>(key: string, defaultValue?: T): T | undefined {
  return (config[key] as T) ?? defaultValue;
}

export function has(key: string): boolean {
  return key in config;
}

export function remove(key: string): void {
  delete config[key];
}

export function getAll(): Config {
  return { ...config };
}

export function setAll(newConfig: Config): void {
  config = { ...newConfig };
}

export function clear(): void {
  config = {};
}

export default { set, get, has, remove, getAll, setAll, clear };

