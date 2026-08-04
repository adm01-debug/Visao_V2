/**
 * Onda 188 — Visualizações favoritas (arranjos de mosaico nomeados).
 *
 * Camada de dados sobre `monitor_groups` / `monitor_group_cameras`.
 * Toda decisão de "o que aparece em qual célula" é delegada a
 * `src/lib/views/favoriteViewRestore.ts` — este hook só lê, grava e ordena.
 *
 * Regras honradas aqui:
 *  - Posição é prova: gravamos `slot_index` explícito, nunca reindexamos a lista.
 *  - Restaurar é leitura pura: marcar uso (`last_used_at`) não altera o arranjo.
 *  - Favorito é preferência do usuário: isolado por `user_id` via RLS.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  MAX_FAVORITE_VIEWS,
  type MonitorLayout,
  type RestoreFavoriteViewResult,
  type SavedSlot,
  layoutCapacity,
  normalizeFavoriteName,
  restoreFavoriteView,
} from '@/lib/views/favoriteViewRestore';

export interface FavoriteView {
  id: string;
  name: string;
  layout: MonitorLayout;
  isDefault: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  slots: SavedSlot[];
}

export interface UseFavoriteViewsReturn {
  views: FavoriteView[];
  loading: boolean;
  atQuota: boolean;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  restoreActive: (visibleCameraIds: Iterable<string>) => RestoreFavoriteViewResult | null;
  createView: (name: string, layout: MonitorLayout, slots: SavedSlot[]) => Promise<string | null>;
  saveArrangement: (viewId: string, layout: MonitorLayout, slots: SavedSlot[]) => Promise<boolean>;
  renameView: (viewId: string, name: string) => Promise<boolean>;
  deleteView: (viewId: string) => Promise<void>;
  touchView: (viewId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

interface SlotRow {
  group_id: string;
  camera_id: string;
  slot_index: number;
}

interface GroupRow {
  id: string;
  name: string;
  layout: string;
  is_default: boolean;
  last_used_at: string | null;
  created_at: string;
}

export function useFavoriteViews(): UseFavoriteViewsReturn {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: g, error: gErr }, { data: s, error: sErr }] = await Promise.all([
      supabase
        .from('monitor_groups')
        .select('id, name, layout, is_default, last_used_at, created_at')
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true }),
      supabase
        .from('monitor_group_cameras')
        .select('group_id, camera_id, slot_index')
        .order('slot_index', { ascending: true }),
    ]);
    if (gErr || sErr) toast.error('Não foi possível carregar as visualizações favoritas');
    setGroups((g ?? []) as GroupRow[]);
    setSlots((s ?? []) as SlotRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const views = useMemo<FavoriteView[]>(() => {
    const byGroup = new Map<string, SavedSlot[]>();
    for (const row of slots) {
      const list = byGroup.get(row.group_id) ?? [];
      list.push({ slot_index: row.slot_index, camera_id: row.camera_id });
      byGroup.set(row.group_id, list);
    }
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      layout: g.layout as MonitorLayout,
      isDefault: g.is_default,
      lastUsedAt: g.last_used_at,
      createdAt: g.created_at,
      slots: (byGroup.get(g.id) ?? []).slice().sort((a, b) => a.slot_index - b.slot_index),
    }));
  }, [groups, slots]);

  const restoreActive = useCallback<UseFavoriteViewsReturn['restoreActive']>(
    (visibleCameraIds) => {
      const view = views.find((v) => v.id === activeId);
      if (!view) return null;
      return restoreFavoriteView({
        layout: view.layout,
        saved: view.slots,
        visibleCameraIds,
      });
    },
    [views, activeId]
  );

  /** Substitui o arranjo do favorito preservando `slot_index` (não recompacta buracos). */
  const writeSlots = useCallback(
    async (viewId: string, layout: MonitorLayout, next: SavedSlot[]): Promise<boolean> => {
      if (!user) return false;
      const capacity = layoutCapacity(layout);
      const rows = next
        .filter(
          (s) => Number.isInteger(s.slot_index) && s.slot_index >= 0 && s.slot_index < capacity
        )
        .map((s) => ({
          group_id: viewId,
          camera_id: s.camera_id,
          user_id: user.id,
          slot_index: s.slot_index,
        }));

      const { error: delErr } = await supabase
        .from('monitor_group_cameras')
        .delete()
        .eq('group_id', viewId);
      if (delErr) {
        toast.error(delErr.message);
        return false;
      }
      if (rows.length === 0) return true;
      const { error: insErr } = await supabase.from('monitor_group_cameras').insert(rows);
      if (insErr) {
        toast.error(insErr.message);
        return false;
      }
      return true;
    },
    [user]
  );

  const createView = useCallback<UseFavoriteViewsReturn['createView']>(
    async (name, layout, initialSlots) => {
      if (!user) return null;
      const clean = normalizeFavoriteName(name);
      if (!clean) {
        toast.error('Informe um nome entre 1 e 100 caracteres');
        return null;
      }
      const { data, error } = await supabase
        .from('monitor_groups')
        .insert({ user_id: user.id, name: clean, layout })
        .select('id')
        .single();
      if (error) {
        toast.error(
          error.message.includes('duplicate')
            ? 'Já existe uma visualização com esse nome'
            : error.message
        );
        return null;
      }
      const ok = await writeSlots(data.id, layout, initialSlots);
      await load();
      if (ok) {
        setActiveId(data.id);
        toast.success('Visualização favorita criada');
      }
      return data.id;
    },
    [user, writeSlots, load]
  );

  const saveArrangement = useCallback<UseFavoriteViewsReturn['saveArrangement']>(
    async (viewId, layout, next) => {
      const { error } = await supabase.from('monitor_groups').update({ layout }).eq('id', viewId);
      if (error) {
        toast.error(error.message);
        return false;
      }
      const ok = await writeSlots(viewId, layout, next);
      await load();
      if (ok) toast.success('Arranjo salvo');
      return ok;
    },
    [writeSlots, load]
  );

  const renameView = useCallback<UseFavoriteViewsReturn['renameView']>(
    async (viewId, name) => {
      const clean = normalizeFavoriteName(name);
      if (!clean) {
        toast.error('Informe um nome entre 1 e 100 caracteres');
        return false;
      }
      const { error } = await supabase
        .from('monitor_groups')
        .update({ name: clean })
        .eq('id', viewId);
      if (error) {
        toast.error(
          error.message.includes('duplicate')
            ? 'Já existe uma visualização com esse nome'
            : error.message
        );
        return false;
      }
      await load();
      return true;
    },
    [load]
  );

  const deleteView = useCallback<UseFavoriteViewsReturn['deleteView']>(
    async (viewId) => {
      const { error } = await supabase.from('monitor_groups').delete().eq('id', viewId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setActiveId((cur) => (cur === viewId ? null : cur));
      await load();
      toast.success('Visualização removida');
    },
    [load]
  );

  const touchView = useCallback<UseFavoriteViewsReturn['touchView']>(async (viewId) => {
    // Marcar uso é metadado de conveniência: falha aqui nunca bloqueia a restauração.
    await supabase
      .from('monitor_groups')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', viewId);
  }, []);

  return {
    views,
    loading,
    atQuota: views.length >= MAX_FAVORITE_VIEWS,
    activeId,
    setActiveId,
    restoreActive,
    createView,
    saveArrangement,
    renameView,
    deleteView,
    touchView,
    refetch: load,
  };
}
