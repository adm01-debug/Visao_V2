import { useState, useEffect, useCallback } from 'react';
import { getItem, setItem, getDB } from '@/lib/indexedDB';

export function useIndexedDB<T>(store: string, key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getDB().then(() => getItem<T>(store, key))
      .then((data) => { if (data !== null) setValue(data); })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [store, key]);

  const updateValue = useCallback(async (newValue: T) => {
    try {
      await setItem(store, key, newValue);
      setValue(newValue);
    } catch (e) {
      setError(e as Error);
    }
  }, [store, key]);

  return { value, setValue: updateValue, loading, error };
}
