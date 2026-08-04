/**
 * Onda Shinobi 6 — Motion Masks
 * CRUD + realtime das máscaras de movimento por câmera.
 * Coordenadas normalizadas (0..1) para independência de resolução.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MaskMode = 'include' | 'exclude';
export type MaskPolygon = [number, number][];

export interface MotionMask {
  id: string;
  user_id: string;
  camera_id: string;
  name: string;
  mode: MaskMode;
  polygon: MaskPolygon;
  sensitivity: number;
  color: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MotionMaskInput {
  camera_id: string;
  name: string;
  mode: MaskMode;
  polygon: MaskPolygon;
  sensitivity?: number;
  color?: string;
  enabled?: boolean;
}

export function validateMask(i: MotionMaskInput): string | null {
  if (!i.name?.trim()) return 'Nome é obrigatório';
  if (!i.camera_id) return 'Câmera é obrigatória';
  if (!Array.isArray(i.polygon) || i.polygon.length < 3) return 'Desenhe pelo menos 3 pontos';
  const bad = i.polygon.some(
    (p) =>
      !Array.isArray(p) ||
      p.length !== 2 ||
      !Number.isFinite(p[0]) ||
      !Number.isFinite(p[1]) ||
      p[0] < 0 ||
      p[0] > 1 ||
      p[1] < 0 ||
      p[1] > 1
  );
  if (bad) return 'Pontos precisam estar entre 0 e 1';
  return null;
}

export function useMotionMasks(cameraId?: string) {
  const { user } = useAuth();
  const [masks, setMasks] = useState<MotionMask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setMasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase.from('motion_masks').select('*').order('created_at', { ascending: false });
    if (cameraId) q = q.eq('camera_id', cameraId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setMasks((data ?? []) as unknown as MotionMask[]);
    setLoading(false);
  }, [user, cameraId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`motion-masks-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motion_masks' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  const create = useCallback(
    async (input: MotionMaskInput) => {
      if (!user) return null;
      const err = validateMask(input);
      if (err) {
        toast.error(err);
        return null;
      }
      const { data, error } = await supabase
        .from('motion_masks')
        .insert({
          user_id: user.id,
          camera_id: input.camera_id,
          name: input.name.trim(),
          mode: input.mode,
          polygon: input.polygon as unknown as never,
          sensitivity: input.sensitivity ?? 50,
          color: input.color ?? '#22c55e',
          enabled: input.enabled ?? true,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return null;
      }
      toast.success('Máscara criada');
      return data as unknown as MotionMask;
    },
    [user]
  );

  const update = useCallback(async (id: string, patch: Partial<MotionMaskInput>) => {
    const payload: Record<string, unknown> = { ...patch };
    if (patch.polygon) payload.polygon = patch.polygon as unknown as never;
    const { error } = await supabase
      .from('motion_masks')
      .update(payload as never)
      .eq('id', id);
    if (error) toast.error(error.message);
  }, []);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    const { error } = await supabase.from('motion_masks').update({ enabled }).eq('id', id);
    if (error) toast.error(error.message);
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('motion_masks').delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Máscara removida');
  }, []);

  return { masks, loading, create, update, toggle, remove };
}

/** point-in-polygon ray casting (coords normalizadas 0..1) */
export function pointInPolygon(pt: [number, number], poly: MaskPolygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    if (!pi || !pj) continue;
    const [xi, yi] = pi;
    const [xj, yj] = pj;
    const intersect =
      yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
