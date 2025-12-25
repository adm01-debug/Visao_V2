import { useReducer, useCallback, useState } from 'react';

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

type AsyncAction<T> =
  | { type: 'START' }
  | { type: 'SUCCESS'; payload: T }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET' };

function asyncReducer<T>(initialData: T) {
  return (state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> => {
    switch (action.type) {
      case 'START':
        return { ...state, loading: true, error: null };
      case 'SUCCESS':
        return { data: action.payload, loading: false, error: null };
      case 'ERROR':
        return { ...state, loading: false, error: action.error };
      case 'RESET':
        return { data: initialData, loading: false, error: null };
      default:
        return state;
    }
  };
}

export function useAsyncReducer<T>(initialData: T) {
  const [state, dispatch] = useReducer(asyncReducer<T>(initialData), {
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(async <R>(
    asyncFn: () => Promise<R>,
    transform?: (result: R) => T
  ) => {
    dispatch({ type: 'START' });
    try {
      const result = await asyncFn();
      const data = transform ? transform(result) : (result as unknown as T);
      dispatch({ type: 'SUCCESS', payload: data });
      return data;
    } catch (error) {
      dispatch({ type: 'ERROR', error: error as Error });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export default useAsyncReducer;
