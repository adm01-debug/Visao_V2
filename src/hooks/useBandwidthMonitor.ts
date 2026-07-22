/**
 * Onda Shinobi 10 — Bandwidth Monitor
 * Consulta consumo de banda por câmera e insere amostras (para agentes locais).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BandwidthSummaryRow {
  camera_id: string;
  camera_name: string;
  total_gb: number;
  avg_bitrate_kbps: number;
  peak_bitrate_kbps: number;
  sample_count: number;
}

export interface BandwidthSample {
  id: string;
  camera_id: string;
  sampled_at: string;
  bytes_received: number;
  bitrate_kbps: number;
  fps: number | null;
  resolution: string | null;
  stream_type: string;
}

export function useBandwidthMonitor(days: number = 7) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<BandwidthSummaryRow[]>([]);
  const [recent, setRecent] = useState<BandwidthSample[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: sum, error: sErr }, { data: rec, error: rErr }] = await Promise.all([
        supabase.rpc('get_bandwidth_summary', { days }),
        supabase
          .from('camera_bandwidth_samples')
          .select('id,camera_id,sampled_at,bytes_received,bitrate_kbps,fps,resolution,stream_type')
          .order('sampled_at', { ascending: false })
          .limit(200),
      ]);
      if (sErr) throw sErr;
      if (rErr) throw rErr;
      setSummary((sum ?? []) as BandwidthSummaryRow[]);
      setRecent((rec ?? []) as BandwidthSample[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar consumo de banda';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user, days]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const recordSample = useCallback(
    async (input: {
      camera_id: string;
      bytes_received: number;
      bitrate_kbps: number;
      window_seconds?: number;
      fps?: number;
      resolution?: string;
      stream_type?: 'main' | 'sub' | 'hls' | 'webrtc';
    }) => {
      if (!user) return;
      const { error } = await supabase.from('camera_bandwidth_samples').insert({
        camera_id: input.camera_id,
        user_id: user.id,
        bytes_received: input.bytes_received,
        bitrate_kbps: input.bitrate_kbps,
        window_seconds: input.window_seconds ?? 60,
        fps: input.fps ?? null,
        resolution: input.resolution ?? null,
        stream_type: input.stream_type ?? 'main',
      });
      if (error) {
        toast.error(`Falha ao registrar amostra: ${error.message}`);
        return false;
      }
      return true;
    },
    [user],
  );

  return { summary, recent, loading, refresh: fetchAll, recordSample };
}
