const DB_NAME = 'visao_db';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains('recordings')) {
        database.createObjectStore('recordings', { keyPath: 'id' });
      }
    };
  });
};

export const getDB = async (): Promise<IDBDatabase> => {
  if (db) return db;
  return initDB();
};

export const setItem = async <T>(store: string, key: string, value: T): Promise<void> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readwrite');
    tx.objectStore(store).put({ key, value, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getItem = async <T>(store: string, key: string): Promise<T | null> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readonly');
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
};
