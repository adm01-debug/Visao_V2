/**
 * useShare Hook
 * Web Share API
 */
import { useCallback, useState } from 'react';

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export function useShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isSupported = typeof navigator !== 'undefined' && 'share' in navigator;

  const canShare = useCallback((data: ShareData) => {
    if (!isSupported) return false;
    if (data.files && navigator.canShare) return navigator.canShare({ files: data.files });
    return true;
  }, [isSupported]);

  const share = useCallback(async (data: ShareData) => {
    if (!isSupported) { setError(new Error('Not supported')); return false; }
    setIsSharing(true);
    try {
      await navigator.share(data);
      setError(null);
      return true;
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e as Error);
      return false;
    } finally { setIsSharing(false); }
  }, [isSupported]);

  return { isSupported, isSharing, error, canShare, share };
}
export default useShare;
