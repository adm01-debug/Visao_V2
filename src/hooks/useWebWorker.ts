/**
 * useWebWorker Hook
 * Execute heavy computations in Web Worker
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseWebWorkerOptions<T, R> {
  workerFunction: (data: T) => R;
  onSuccess?: (result: R) => void;
  onError?: (error: Error) => void;
}

export interface UseWebWorkerReturn<T, R> {
  run: (data: T) => void;
  result: R | null;
  error: Error | null;
  isRunning: boolean;
  terminate: () => void;
}

function createWorkerBlob(fn: Function): string {
  const fnString = fn.toString();
  const workerCode = `
    self.onmessage = function(e) {
      try {
        const fn = ${fnString};
        const result = fn(e.data);
        if (result instanceof Promise) {
          result.then(r => self.postMessage({ success: true, result: r }))
                .catch(err => self.postMessage({ success: false, error: err.message }));
        } else {
          self.postMessage({ success: true, result });
        }
      } catch (error) {
        self.postMessage({ success: false, error: error.message });
      }
    };
  `;
  return URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
}

export function useWebWorker<T = unknown, R = unknown>(
  options: UseWebWorkerOptions<T, R>
): UseWebWorkerReturn<T, R> {
  const { workerFunction, onSuccess, onError } = options;
  
  const [result, setResult] = useState<R | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const run = useCallback((data: T) => {
    terminate();
    setError(null);
    setIsRunning(true);

    try {
      blobUrlRef.current = createWorkerBlob(workerFunction);
      workerRef.current = new Worker(blobUrlRef.current);

      workerRef.current.onmessage = (e) => {
        const { success, result: workerResult, error: workerError } = e.data;
        
        if (success) {
          setResult(workerResult);
          onSuccess?.(workerResult);
        } else {
          const err = new Error(workerError);
          setError(err);
          onError?.(err);
        }
        
        setIsRunning(false);
        terminate();
      };

      workerRef.current.onerror = (e) => {
        const err = new Error(e.message);
        setError(err);
        onError?.(err);
        setIsRunning(false);
        terminate();
      };

      workerRef.current.postMessage(data);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Worker creation failed');
      setError(err);
      onError?.(err);
      setIsRunning(false);
    }
  }, [workerFunction, onSuccess, onError, terminate]);

  useEffect(() => {
    return () => terminate();
  }, [terminate]);

  return { run, result, error, isRunning, terminate };
}

export default useWebWorker;
