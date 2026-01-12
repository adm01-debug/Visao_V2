import { useState, useEffect, useCallback } from 'react';

interface ConnectionState { isOnline: boolean; isSlowConnection: boolean; effectiveType: string | null; downlink: number | null; }

export function useConnectionStatus() {
  const [state, setState] = useState<ConnectionState>({ isOnline: navigator.onLine, isSlowConnection: false, effectiveType: null, downlink: null });

  const updateState = useCallback(() => {
    const connection = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number } }).connection;
    setState({
      isOnline: navigator.onLine,
      isSlowConnection: connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g',
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null
    });
  }, []);

  useEffect(() => {
    updateState();
    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);
    const conn = (navigator as unknown as { connection?: EventTarget }).connection;
    conn?.addEventListener?.('change', updateState);
    return () => {
      window.removeEventListener('online', updateState);
      window.removeEventListener('offline', updateState);
      conn?.removeEventListener?.('change', updateState);
    };
  }, [updateState]);

  return state;
}

export default useConnectionStatus;
