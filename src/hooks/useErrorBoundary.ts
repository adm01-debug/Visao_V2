import { useState, useCallback } from 'react';
import { captureException } from '@/lib/errorTracking';
import { safeExecute } from '@/lib/safeExecute';

interface ErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
  resetError: () => void;
  handleError: (error: Error) => void;
}

export const useErrorBoundary = (): ErrorBoundaryState => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((err: Error) => {
    setError(err);
    captureException(err);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return { error, hasError: error !== null, resetError, handleError };
};


// Note: Error handling should be added to async operations