import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NvrWithChannels {
  id: string;
  name: string;
  location: string | null;
  brand: string;
  host: string;
  rtsp_port: number;
  channel_count: number;
  template_id: string;
  agent_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  channels_registered: number;
  channels_online: number;
  channels_offline: number;
}

/**
 * Lista todos os NVRs do usuário com contagem agregada dos canais associados.
 * Fonte única para dashboards NVR (bridge, saúde por canal, agendamentos).
 */
export function useNvrs(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ['nvrs', 'with-channels'],
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<NvrWithChannels[]> => {
      const { data: nvrs, error } = await supabase
        .from('nvrs')
        .select(
          'id, name, location, brand, host, rtsp_port, channel_count, template_id, agent_id, notes, created_at, updated_at'
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!nvrs || nvrs.length === 0) return [];

      const ids = nvrs.map((n) => n.id);
      const { data: cams, error: cErr } = await supabase
        .from('cameras')
        .select('nvr_id, status')
        .in('nvr_id', ids);
      if (cErr) throw cErr;

      const byNvr = new Map<string, { total: number; online: number; offline: number }>();
      for (const cam of cams ?? []) {
        if (!cam.nvr_id) continue;
        const entry = byNvr.get(cam.nvr_id) ?? { total: 0, online: 0, offline: 0 };
        entry.total += 1;
        if (cam.status === 'online') entry.online += 1;
        else if (cam.status === 'offline') entry.offline += 1;
        byNvr.set(cam.nvr_id, entry);
      }

      return nvrs.map((n) => {
        const stats = byNvr.get(n.id) ?? { total: 0, online: 0, offline: 0 };
        return {
          ...n,
          channels_registered: stats.total,
          channels_online: stats.online,
          channels_offline: stats.offline,
        } as NvrWithChannels;
      });
    },
  });
}
