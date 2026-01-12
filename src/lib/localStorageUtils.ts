/**
 * LocalStorage Utilities with type safety
 * @module lib/localStorageUtils
 */

export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function clear(): void {
  try {
    localStorage.clear();
  } catch {}
}

export function hasItem(key: string): boolean {
  return localStorage.getItem(key) !== null;
}

export function getKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

export default { getItem, setItem, removeItem, clear, hasItem, getKeys };
