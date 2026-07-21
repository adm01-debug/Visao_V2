/**
 * Onda Shinobi 7 — Stream Health & Auto-restart
 * Consulta saúde recente e eventos de restart por câmera do usuário.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface HealthCheck {
  id: string;
  camera_id: string;
  status: 'ok' | 'fail';
  latency_ms: number | null;
  http_code: number | null;
  message: string | null;
  created_at: string;
}

export interface RestartEvent {
  id: string;
  camera_id: string;
  reason: string;
  attempt: number;
  triggered_by: 'auto' | 'manual';
  succeeded: boolean | null;
  message: string | null;
  created_at: string;
}

export interface CameraHealthSummary {
  camera_id: string;
  total: number;
  fails: number;
  last_status: 'ok' | 'fail' | null;
  last_check_at: string | null;
  unhealthy: boolean;
}

export function useStreamHealth() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [restarts, setRestarts] = useState<RestartEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: hc }, { data: re }] = await Promise.all([
      supabase
        .from('stream_health_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('stream_restart_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setChecks((hc ?? []) as HealthCheck[]);
    setRestarts((re ?? []) as RestartEvent[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const summaries: CameraHealthSummary[] = Object.values(
    checks.reduce<Record<string, CameraHealthSummary>>((acc, c) => {
      const s = acc[c.camera_id] ?? {
        camera_id: c.camera_id,
        total: 0,
        fails: 0,
        last_status: null,
        last_check_at: null,
        unhealthy: false,
      };
      s.total += 1;
      if (c.status === 'fail') s.fails += 1;
      if (!s.last_check_at) {
        s.last_status = c.status;
        s.last_check_at = c.created_at;
      }
      acc[c.camera_id] = s;
      return acc;
    }, {}),
  ).map((s) => ({ ...s, unhealthy: s.total >= 6 && s.fails >= 3 }));

  const triggerManualRestart = useCallback(
    async (cameraId: string, reason = 'manual:user_request') => {
      if (!user) return;
      const { error } = await supabase.from('stream_restart_events').insert({
        user_id: user.id,
        camera_id: cameraId,
        reason,
        attempt: 1,
        triggered_by: 'manual',
      });
      if (error) {
        toast.error('Falha ao registrar restart', { description: error.message });
        return;
      }
      toast.success('Restart solicitado');
      await load();
    },
    [user, load],
  );

  return { checks, restarts, summaries, loading, reload: load, triggerManualRestart };
}
