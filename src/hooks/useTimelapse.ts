/**
 * Onda Shinobi 5 — Timelapse
 * CRUD + realtime das configs e listagem de vídeos por usuário.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TimelapseConfig {
  id: string;
  user_id: string;
  camera_id: string;
  enabled: boolean;
  capture_interval_minutes: number;
  start_hour: number;
  end_hour: number;
  fps: number;
  retention_days: number;
  timezone: string;
  last_capture_at: string | null;
  last_render_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelapseVideo {
  id: string;
  config_id: string;
  camera_id: string;
  video_date: string;
  storage_path: string | null;
  frame_count: number;
  duration_seconds: number;
  status: 'pending' | 'rendering' | 'ready' | 'failed' | 'skipped';
  error: string | null;
  rendered_at: string | null;
  created_at: string;
}

export interface TimelapseConfigInput {
  camera_id: string;
  enabled?: boolean;
  capture_interval_minutes: number;
  start_hour: number;
  end_hour: number;
  fps: number;
  retention_days: number;
  timezone?: string;
}

export function validateTimelapseInput(i: TimelapseConfigInput): string | null {
  if (!i.camera_id) return 'Selecione uma câmera';
  if (i.capture_interval_minutes < 1 || i.capture_interval_minutes > 120)
    return 'Intervalo deve estar entre 1 e 120 minutos';
  if (i.start_hour < 0 || i.start_hour > 23) return 'Hora inicial inválida';
  if (i.end_hour < 1 || i.end_hour > 24) return 'Hora final inválida';
  if (i.start_hour >= i.end_hour) return 'Hora inicial deve ser menor que a final';
  if (i.fps < 5 || i.fps > 60) return 'FPS deve estar entre 5 e 60';
  if (i.retention_days < 1 || i.retention_days > 365) return 'Retenção entre 1 e 365 dias';
  return null;
}

export function useTimelapse() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<TimelapseConfig[]>([]);
  const [videos, setVideos] = useState<TimelapseVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setConfigs([]); setVideos([]); setLoading(false); return; }
    setLoading(true);
    const [c, v] = await Promise.all([
      supabase.from('timelapse_configs').select('*').order('created_at', { ascending: false }),
      supabase.from('timelapse_videos').select('*').order('video_date', { ascending: false }).limit(50),
    ]);
    if (c.error) toast.error(c.error.message);
    if (v.error) toast.error(v.error.message);
    setConfigs((c.data ?? []) as TimelapseConfig[]);
    setVideos((v.data ?? []) as TimelapseVideo[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`timelapse-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timelapse_configs' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timelapse_videos' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const upsert = useCallback(async (input: TimelapseConfigInput) => {
    if (!user) return null;
    const err = validateTimelapseInput(input);
    if (err) { toast.error(err); return null; }
    const { data, error } = await supabase
      .from('timelapse_configs')
      .upsert({
        user_id: user.id,
        camera_id: input.camera_id,
        enabled: input.enabled ?? true,
        capture_interval_minutes: input.capture_interval_minutes,
        start_hour: input.start_hour,
        end_hour: input.end_hour,
        fps: input.fps,
        retention_days: input.retention_days,
        timezone: input.timezone ?? 'America/Sao_Paulo',
      }, { onConflict: 'user_id,camera_id' })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success('Configuração salva');
    return data as TimelapseConfig;
  }, [user]);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    const { error } = await supabase.from('timelapse_configs').update({ enabled }).eq('id', id);
    if (error) toast.error(error.message);
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('timelapse_configs').delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Configuração removida');
  }, []);

  return { configs, videos, loading, upsert, toggle, remove };
}
