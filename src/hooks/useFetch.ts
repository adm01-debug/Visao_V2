import { useState, useEffect, useCallback } from 'react';

interface UseFetchState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

interface UseFetchOptions {
  immediate?: boolean;
  headers?: Record<string, string>;
}

export function useFetch<T>(url: string, options: UseFetchOptions = {}) {
  const { immediate = true, headers = {} } = options;
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    error: null,
    isLoading: immediate,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setState({ data, error: null, isLoading: false });
      return data;
    } catch (error) {
      setState({ data: null, error: error as Error, isLoading: false });
      throw error;
    }
  }, [url, headers]);

  useEffect(() => {
    if (immediate) fetchData();
  }, [immediate, fetchData]);

  return { ...state, refetch: fetchData };
}

export default useFetch;
