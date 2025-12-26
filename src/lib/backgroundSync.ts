/**
 * Background Sync
 */
export async function registerSync(tag: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) return false;
  const reg = await navigator.serviceWorker.ready;
  await (reg as any).sync.register(tag);
  return true;
}
export async function registerPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) return false;
  const reg = await navigator.serviceWorker.ready;
  await (reg as any).periodicSync.register(tag, { minInterval });
  return true;
}
