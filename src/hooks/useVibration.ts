/**
 * useVibration Hook
 * Vibration API
 */
import { useCallback } from 'react';

export function useVibration() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: number | number[]) => {
    if (isSupported) navigator.vibrate(pattern);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) navigator.vibrate(0);
  }, [isSupported]);

  return { isSupported, vibrate, stop };
}
export default useVibration;
