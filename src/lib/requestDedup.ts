/**
 * Request Deduplication
 */
const pendingRequests = new Map<string, Promise<any>>();
export async function dedupedFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const key = `${options?.method || 'GET'}:${url}`;
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const promise = fetch(url, options).then(r => r.json()).finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}
export function cancelPending(url?: string): void {
  if (url) pendingRequests.delete(url);
  else pendingRequests.clear();
}
