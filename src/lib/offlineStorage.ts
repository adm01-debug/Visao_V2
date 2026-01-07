/**
 * Offline Storage System
 * Handles IndexedDB storage for offline data caching and sync queue
 */

const DB_NAME = 'visao_offline_db';
const DB_VERSION = 2;

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

export interface CachedData<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
}

let db: IDBDatabase | null = null;

export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Data cache store
      if (!database.objectStoreNames.contains('dataCache')) {
        const cacheStore = database.createObjectStore('dataCache', { keyPath: 'key' });
        cacheStore.createIndex('timestamp', 'timestamp');
        cacheStore.createIndex('expiresAt', 'expiresAt');
      }
      
      // Pending actions queue (for sync when back online)
      if (!database.objectStoreNames.contains('pendingActions')) {
        const actionsStore = database.createObjectStore('pendingActions', { keyPath: 'id' });
        actionsStore.createIndex('timestamp', 'timestamp');
        actionsStore.createIndex('table', 'table');
      }
      
      // Alerts cache
      if (!database.objectStoreNames.contains('alerts')) {
        const alertsStore = database.createObjectStore('alerts', { keyPath: 'id' });
        alertsStore.createIndex('timestamp', 'timestamp');
        alertsStore.createIndex('severity', 'severity');
      }
      
      // Cameras cache
      if (!database.objectStoreNames.contains('cameras')) {
        database.createObjectStore('cameras', { keyPath: 'id' });
      }
      
      // Persons cache
      if (!database.objectStoreNames.contains('persons')) {
        database.createObjectStore('persons', { keyPath: 'id' });
      }
    };
  });
};

export const getOfflineDB = async (): Promise<IDBDatabase> => {
  if (db) return db;
  return initOfflineDB();
};

// ================== DATA CACHE ==================

export const cacheData = async <T>(
  key: string, 
  data: T, 
  ttlMinutes: number = 60
): Promise<void> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('dataCache', 'readwrite');
    const store = tx.objectStore('dataCache');
    
    const item: CachedData<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    };
    
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('dataCache', 'readonly');
    const store = tx.objectStore('dataCache');
    const request = store.get(key);
    
    request.onsuccess = () => {
      const result = request.result as CachedData<T> | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      
      // Check if expired
      if (result.expiresAt && result.expiresAt < Date.now()) {
        // Delete expired data
        const deleteTx = database.transaction('dataCache', 'readwrite');
        deleteTx.objectStore('dataCache').delete(key);
        resolve(null);
        return;
      }
      
      resolve(result.data);
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const clearExpiredCache = async (): Promise<void> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('dataCache', 'readwrite');
    const store = tx.objectStore('dataCache');
    const index = store.index('expiresAt');
    const now = Date.now();
    
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ================== PENDING ACTIONS ==================

export const addPendingAction = async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): Promise<string> => {
  const database = await getOfflineDB();
  const id = crypto.randomUUID();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    
    const fullAction: OfflineAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retries: 0
    };
    
    store.add(fullAction);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
};

export const getPendingActions = async (): Promise<OfflineAction[]> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingActions', 'readonly');
    const store = tx.objectStore('pendingActions');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const removePendingAction = async (id: string): Promise<void> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingActions', 'readwrite');
    tx.objectStore('pendingActions').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const updatePendingActionRetries = async (id: string): Promise<void> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const request = store.get(id);
    
    request.onsuccess = () => {
      if (request.result) {
        const action = request.result as OfflineAction;
        action.retries += 1;
        store.put(action);
      }
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ================== ENTITY STORES ==================

export const cacheAlerts = async (alerts: unknown[]): Promise<void> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('alerts', 'readwrite');
    const store = tx.objectStore('alerts');
    
    // Clear and repopulate
    store.clear();
    alerts.forEach(alert => store.add(alert));
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedAlerts = async (): Promise<unknown[]> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('alerts', 'readonly');
    const request = tx.objectStore('alerts').getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const cacheCameras = async (cameras: unknown[]): Promise<void> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('cameras', 'readwrite');
    const store = tx.objectStore('cameras');
    
    store.clear();
    cameras.forEach(camera => store.add(camera));
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedCameras = async (): Promise<unknown[]> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('cameras', 'readonly');
    const request = tx.objectStore('cameras').getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const cachePersons = async (persons: unknown[]): Promise<void> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('persons', 'readwrite');
    const store = tx.objectStore('persons');
    
    store.clear();
    persons.forEach(person => store.add(person));
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedPersons = async (): Promise<unknown[]> => {
  const database = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('persons', 'readonly');
    const request = tx.objectStore('persons').getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// ================== UTILITIES ==================

export const getStorageStats = async (): Promise<{
  pendingActionsCount: number;
  cachedAlertsCount: number;
  cachedCamerasCount: number;
  cachedPersonsCount: number;
}> => {
  const database = await getOfflineDB();
  
  const getCount = (storeName: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };
  
  const [pendingActionsCount, cachedAlertsCount, cachedCamerasCount, cachedPersonsCount] = await Promise.all([
    getCount('pendingActions'),
    getCount('alerts'),
    getCount('cameras'),
    getCount('persons')
  ]);
  
  return { pendingActionsCount, cachedAlertsCount, cachedCamerasCount, cachedPersonsCount };
};

export const clearAllOfflineData = async (): Promise<void> => {
  const database = await getOfflineDB();
  const stores = ['dataCache', 'pendingActions', 'alerts', 'cameras', 'persons'];
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(stores, 'readwrite');
    stores.forEach(store => tx.objectStore(store).clear());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
