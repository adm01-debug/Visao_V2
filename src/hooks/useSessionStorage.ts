import { useState, useCallback } from 'react';

export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error setting sessionStorage:', error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error('Error removing from sessionStorage:', error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
