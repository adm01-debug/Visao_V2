/**
 * VISÃO — Hook para consumir a agregação `get_preview_telemetry_summary`.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PreviewTelemetryBucket {
  started: number;
  extended?: number;
  stopped?: number;
  failed: number;
  total?: number;
}

export interface PreviewTelemetryTotals {
  total_events: number;
  started: number;
  extended: number;
  stopped: number;
  failed: number;
  sessions: number;
  unique_users: number;
  avg_start_latency_ms: number | null;
  p95_start_latency_ms: number | null;
}

export interface PreviewTelemetrySummary {
  window_hours: number;
  generated_at: string;
  totals: PreviewTelemetryTotals;
  by_codec: Array<{ codec: string } & PreviewTelemetryBucket>;
  by_resolution: Array<{ resolution: string } & PreviewTelemetryBucket>;
  by_browser: Array<{ browser: string } & PreviewTelemetryBucket>;
  top_errors: Array<{ error_code: string; total: number }>;
  timeline: Array<{
    bucket: string;
    started: number;
    extended: number;
    stopped: number;
    failed: number;
  }>;
}

export function usePreviewTelemetrySummary(windowHours = 24, enabled = true) {
  return useQuery({
    queryKey: ['preview-telemetry-summary', windowHours],
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<PreviewTelemetrySummary | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_preview_telemetry_summary', {
        window_hours: windowHours,
      });
      if (error) throw new Error(error.message);
      return (data as PreviewTelemetrySummary) ?? null;
    },
  });
}
