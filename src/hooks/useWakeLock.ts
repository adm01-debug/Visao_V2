/**
 * useWakeLock Hook
 * Screen Wake Lock API
 */
import { useState, useCallback, useEffect, useRef } from 'react';

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const request = useCallback(async () => {
    if (!isSupported) { setError(new Error('Not supported')); return; }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.onrelease = () => setIsLocked(false);
      setIsLocked(true);
      setError(null);
    } catch (e) { setError(e as Error); }
  }, [isSupported]);

  const release = useCallback(async () => {
    await wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setIsLocked(false);
  }, []);

  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible' && isLocked) request(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { release(); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [isLocked, request, release]);

  return { isLocked, isSupported, error, request, release };
}
export default useWakeLock;
