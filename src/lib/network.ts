/**
 * Network utilities
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnline(callback: () => void): () => void {
  window.addEventListener('online', callback);
  return () => window.removeEventListener('online', callback);
}

export function onOffline(callback: () => void): () => void {
  window.addEventListener('offline', callback);
  return () => window.removeEventListener('offline', callback);
}

export async function getConnectionInfo(): Promise<{
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
} | null> {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!conn) return null;
  return {
    type: conn.type || 'unknown',
    effectiveType: conn.effectiveType || 'unknown',
    downlink: conn.downlink || 0,
    rtt: conn.rtt || 0,
  };
}

interface NetworkInformation {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export default { isOnline, onOnline, onOffline, getConnectionInfo };
