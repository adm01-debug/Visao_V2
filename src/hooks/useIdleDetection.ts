/**
 * useIdleDetection Hook
 * User idle detection
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseIdleDetectionOptions {
  timeout?: number;
  events?: string[];
  onIdle?: () => void;
  onActive?: () => void;
}

export function useIdleDetection(options: UseIdleDetectionOptions = {}) {
  const { timeout = 60000, events = ['mousemove', 'keydown', 'scroll', 'touchstart'], onIdle, onActive } = options;
  const [isIdle, setIsIdle] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLastActivity(Date.now());
    if (isIdle) { setIsIdle(false); onActive?.(); }
    timerRef.current = setTimeout(() => { setIsIdle(true); onIdle?.(); }, timeout);
  }, [timeout, isIdle, onIdle, onActive]);

  useEffect(() => {
    events.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [events, resetTimer]);

  return { isIdle, lastActivity, reset: resetTimer };
}
export default useIdleDetection;
