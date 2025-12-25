import { useEffect, useRef, useCallback, useState } from 'react';

interface PollingOptions {
  interval: number;
  enabled?: boolean;
}

export function usePolling<T>(fn: () => Promise<T>, options: PollingOptions) {
  const { interval, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const poll = useCallback(async () => {
    try {
      const result = await fn();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    }
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;
    poll();
    timeoutRef.current = setInterval(poll, interval);
    return () => { if (timeoutRef.current) clearInterval(timeoutRef.current); };
  }, [poll, interval, enabled]);

  return { data, error, refetch: poll };
}
