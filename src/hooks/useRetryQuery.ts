/**
 * VISÃO - React Query retry with exponential backoff config
 * Use as default options for QueryClient
 */
export const retryWithBackoff = {
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  staleTime: 30000,
  refetchOnWindowFocus: false,
};
