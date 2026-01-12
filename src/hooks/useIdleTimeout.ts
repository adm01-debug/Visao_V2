import { useState, useEffect, useCallback, useRef } from 'react';

export function useIdleTimeout(timeout = 60000, onIdle?: () => void) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { setIsIdle(true); onIdle?.(); }, timeout);
  }, [timeout, onIdle]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  return { isIdle, resetTimer };
}

export default useIdleTimeout;
