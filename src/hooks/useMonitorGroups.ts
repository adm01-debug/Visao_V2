/**
 * Onda Shinobi 3 — Hook de Grupos de Monitoramento
 *
 * CRUD + realtime subscription para monitor_groups e monitor_group_cameras.
 * Todas as escritas assumem `auth.uid()` já autenticado (RLS enforça isolamento).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MonitorLayout = '1x1' | '2x2' | '3x3' | '4x4' | '1+5' | '2+8';

export const LAYOUT_SLOTS: Record<MonitorLayout, number> = {
  '1x1': 1,
  '2x2': 4,
  '3x3': 9,
  '4x4': 16,
  '1+5': 6,
  '2+8': 10,
};

export interface MonitorGroup {
  id: string;
  user_id: string;
  name: string;
  layout: MonitorLayout;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitorGroupCamera {
  id: string;
  group_id: string;
  camera_id: string;
  user_id: string;
  slot_index: number;
}

export interface UseMonitorGroupsReturn {
  groups: MonitorGroup[];
  slotsByGroup: Record<string, MonitorGroupCamera[]>;
  loading: boolean;
  createGroup: (name: string, layout: MonitorLayout) => Promise<MonitorGroup | null>;
  renameGroup: (id: string, name: string) => Promise<void>;
  changeLayout: (id: string, layout: MonitorLayout) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  setCameras: (groupId: string, cameraIds: string[]) => Promise<void>;
}

export function useMonitorGroups(): UseMonitorGroupsReturn {
  const { user } = useAuth();
  const [groups, setGroups] = useState<MonitorGroup[]>([]);
  const [slots, setSlots] = useState<MonitorGroupCamera[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from('monitor_groups').select('*').order('created_at', { ascending: true }),
      supabase.from('monitor_group_cameras').select('*').order('slot_index', { ascending: true }),
    ]);
    setGroups((g ?? []) as MonitorGroup[]);
    setSlots((s ?? []) as MonitorGroupCamera[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`monitor-groups-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitor_groups' }, () =>
        load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monitor_group_cameras' },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const slotsByGroup = useMemo(() => {
    const map: Record<string, MonitorGroupCamera[]> = {};
    for (const s of slots) {
      (map[s.group_id] ??= []).push(s);
    }
    for (const k of Object.keys(map)) map[k]!.sort((a, b) => a.slot_index - b.slot_index);
    return map;
  }, [slots]);

  const createGroup = useCallback<UseMonitorGroupsReturn['createGroup']>(
    async (name, layout) => {
      if (!user) return null;
      const trimmed = name.trim();
      if (!trimmed) {
        toast.error('Nome do grupo é obrigatório');
        return null;
      }
      const { data, error } = await supabase
        .from('monitor_groups')
        .insert({ user_id: user.id, name: trimmed, layout })
        .select()
        .single();
      if (error) {
        toast.error(
          error.message.includes('duplicate') ? 'Já existe um grupo com esse nome' : error.message
        );
        return null;
      }
      toast.success('Grupo criado');
      return data as MonitorGroup;
    },
    [user]
  );

  const renameGroup = useCallback(async (id: string, name: string) => {
    const { error } = await supabase
      .from('monitor_groups')
      .update({ name: name.trim() })
      .eq('id', id);
    if (error) toast.error(error.message);
  }, []);

  const changeLayout = useCallback(async (id: string, layout: MonitorLayout) => {
    const { error } = await supabase.from('monitor_groups').update({ layout }).eq('id', id);
    if (error) toast.error(error.message);
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    const { error } = await supabase.from('monitor_groups').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Grupo removido');
  }, []);

  const setCameras = useCallback(
    async (groupId: string, cameraIds: string[]) => {
      if (!user) return;
      if (cameraIds.length > 32) {
        toast.error('Máximo 32 câmeras por grupo');
        return;
      }
      // Substitui todo o conjunto de slots para o grupo (delete + insert em transação lógica)
      const { error: delErr } = await supabase
        .from('monitor_group_cameras')
        .delete()
        .eq('group_id', groupId);
      if (delErr) {
        toast.error(delErr.message);
        return;
      }
      if (cameraIds.length === 0) return;
      const rows = cameraIds.map((camera_id, slot_index) => ({
        group_id: groupId,
        camera_id,
        user_id: user.id,
        slot_index,
      }));
      const { error: insErr } = await supabase.from('monitor_group_cameras').insert(rows);
      if (insErr) toast.error(insErr.message);
      else toast.success('Câmeras atualizadas');
    },
    [user]
  );

  return {
    groups,
    slotsByGroup,
    loading,
    createGroup,
    renameGroup,
    changeLayout,
    deleteGroup,
    setCameras,
  };
}
