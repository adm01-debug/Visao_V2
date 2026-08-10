import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SlowQueryRow {
  query: string;
  calls: number;
  mean_ms: number;
  total_ms: number;
  max_ms: number;
  rows_returned: number;
}

export interface SlowQueriesResponse {
  generated_at: string;
  limit: number;
  rows: SlowQueryRow[];
}

/**
 * Wave 28: fetch top slow queries via admin-slow-queries edge function.
 * Requires admin role; hook stays disabled until enabled=true.
 */
export function useSlowQueries(opts: { limit?: number; enabled?: boolean } = {}) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  return useQuery({
    queryKey: ['admin-slow-queries', limit],
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: (failureCount, err) => {
      const msg = (err as Error)?.message ?? '';
      // Don't retry auth/permission errors.
      if (/401|403|forbidden|unauthorized/i.test(msg)) return false;
      return failureCount < 2;
    },
    queryFn: async (): Promise<SlowQueriesResponse> => {
      const { data, error } = await supabase.functions.invoke('admin-slow-queries', {
        body: { limit },
      });
      if (error) throw new Error(error.message || 'admin-slow-queries failed');
      return data as SlowQueriesResponse;
    },
  });
}
