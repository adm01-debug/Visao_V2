/**
 * SessionStorage Utilities
 * @module lib/sessionStorageUtils
 */

export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to sessionStorage:', e);
  }
}

export function removeItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

export function clear(): void {
  try {
    sessionStorage.clear();
  } catch {}
}

export default { getItem, setItem, removeItem, clear };
