/**
 * useIndexedDBSync Hook
 * IndexedDB synchronization with state
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface DBConfig {
  name: string;
  version: number;
  stores: {
    name: string;
    keyPath: string;
    indexes?: { name: string; keyPath: string; unique?: boolean }[];
  }[];
}

export function useIndexedDBSync<T>(
  storeName: string,
  config: DBConfig
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(config.name, config.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        config.stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
            store.indexes?.forEach(index => {
              objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
            });
          }
        });
      };
    });
  }, [config]);

  const getAll = useCallback(async (): Promise<T[]> => {
    const db = dbRef.current || await openDB();
    dbRef.current = db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, [storeName, openDB]);

  const get = useCallback(async (key: IDBValidKey): Promise<T | undefined> => {
    const db = dbRef.current || await openDB();
    dbRef.current = db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, [storeName, openDB]);

  const add = useCallback(async (item: T): Promise<IDBValidKey> => {
    const db = dbRef.current || await openDB();
    dbRef.current = db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        setData(prev => [...prev, item]);
        resolve(request.result);
      };
    });
  }, [storeName, openDB]);

  const put = useCallback(async (item: T): Promise<IDBValidKey> => {
    const db = dbRef.current || await openDB();
    dbRef.current = db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        setData(prev => {
          const keyPath = config.stores.find(s => s.name === storeName)?.keyPath || 'id';
          const key = (item as Record<string, unknown>)[keyPath];
          const exists = prev.findIndex(p => (p as Record<string, unknown>)[keyPath] === key);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = item;
            return updated;
          }
          return [...prev, item];
        });
        resolve(request.result);
      };
    });
  }, [storeName, openDB, config.stores]);

  const remove = useCallback(async (key: IDBValidKey): Promise<void> => {
    const db = dbRef.current || await openDB();
    dbRef.current = db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        setData(prev => {
          const keyPath = config.stores.find(s => s.name === storeName)?.keyPath || 'id';
          return prev.filter(p => (p as Record<string, unknown>)[keyPath] !== key);
        });
        resolve();
      };
    });
  }, [storeName, openDB, config.stores]);

  const clear = useCallback(async (): Promise<void> => {
    const db = dbRef.current || await openDB();
    dbRef.current = db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        setData([]);
        resolve();
      };
    });
  }, [storeName, openDB]);

  const sync = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getAll();
      setData(items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Sync failed'));
    } finally {
      setIsLoading(false);
    }
  }, [getAll]);

  useEffect(() => {
    sync();
    return () => {
      dbRef.current?.close();
    };
  }, []);

  return { data, isLoading, error, get, add, put, remove, clear, sync };
}

export default useIndexedDBSync;
