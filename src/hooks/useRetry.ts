import { useState, useCallback } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

export function useRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}) {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    setError(null);
    for (let i = 0; i < maxAttempts; i++) {
      try {
        setAttempts(i + 1);
        const result = await fn();
        setLoading(false);
        return result;
      } catch (e) {
        if (i === maxAttempts - 1) {
          setError(e as Error);
          setLoading(false);
          return null;
        }
        await new Promise((r) => setTimeout(r, backoff ? delay * Math.pow(2, i) : delay));
      }
    }
    return null;
  }, [fn, maxAttempts, delay, backoff]);

  return { execute, attempts, loading, error };
}
