// Type declarations for Background Sync API
declare global {
  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }
  interface PeriodicSyncManager {
    register(tag: string, options?: { minInterval: number }): Promise<void>;
    unregister(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }
  interface ServiceWorkerRegistration {
    sync?: SyncManager;
    periodicSync?: PeriodicSyncManager;
  }
}

/**
 * Background Sync
 */
export async function registerSync(tag: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) return false;
  const reg = await navigator.serviceWorker.ready;
  await reg.sync?.register(tag);
  return true;
}
export async function registerPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) return false;
  const reg = await navigator.serviceWorker.ready;
  await reg.periodicSync?.register(tag, { minInterval });
  return true;
}
