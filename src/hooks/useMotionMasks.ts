/**
 * Onda Shinobi 6 — Motion Masks
 * CRUD + realtime das máscaras de movimento por câmera.
 * Coordenadas normalizadas (0..1) para independência de resolução.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * `motion_masks` não está na publicação `supabase_realtime` (conferido em
 * `pg_publication_tables`), então os eventos `postgres_changes` deste hook nunca
 * disparam. O intervalo abaixo é o que garante que uma máscara salva/desligada
 * em outra aba passe a valer durante a mesma sessão de análise.
 */
export const MASK_REFRESH_MS = 15_000;

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

/**
 * @param options.enabled quando `false` não consulta o banco nem abre canal
 *   realtime — usado pelo player, onde as máscaras só importam com a análise
 *   contínua ligada e um grid de câmeras multiplicaria as consultas.
 */
export function useMotionMasks(cameraId?: string, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const { user } = useAuth();
  // Escopo da lista carregada: usuário + câmera. Uma lista só é exposta quando o
  // escopo bate com a seleção atual, senão trocar de câmera com a consulta falhando
  // deixaria as máscaras da câmera anterior na tela (e o botão Remover apagaria
  // a máscara errada, já que remove/toggle agem por id).
  const scope = `${user?.id ?? ''}|${cameraId ?? ''}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [loaded, setLoaded] = useState<{ scope: string; masks: MotionMask[] }>({
    scope,
    masks: [],
  });
  const [loading, setLoading] = useState(true);
  const masks = loaded.scope === scope ? loaded.masks : [];

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!user || !enabled) {
        setLoaded({ scope, masks: [] });
        setLoading(false);
        return;
      }
      // `silent` = releitura de fundo (intervalo/aba voltando ao foco): não troca a
      // tela por "Carregando..." nem repete o toast a cada ciclo.
      if (!silent) setLoading(true);
      let q = supabase.from('motion_masks').select('*').order('created_at', { ascending: false });
      if (cameraId) q = q.eq('camera_id', cameraId);
      const { data, error } = await q;
      // Consulta de um escopo que já não é o atual (troca de câmera com consulta em
      // voo): descartar a resposta evita sobrescrever a lista da câmera nova.
      if (scopeRef.current !== scope) return;
      if (error) {
        // Falha de rede não pode zerar máscaras do mesmo escopo (a IA voltaria a
        // analisar a área excluída), nem reaproveitar a lista de outro escopo.
        if (!silent) toast.error(error.message);
        setLoaded((prev) => (prev.scope === scope ? prev : { scope, masks: [] }));
        setLoading(false);
        return;
      }
      setLoaded({ scope, masks: (data ?? []) as unknown as MotionMask[] });
      setLoading(false);
    },
    [user, cameraId, enabled, scope]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || !enabled) return;
    const ch = supabase
      .channel(`motion-masks-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motion_masks' },
        () => void load({ silent: true })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load, enabled]);

  // Ver MASK_REFRESH_MS: sem isto, o filtro de uma sessão em andamento ficaria congelado.
  useEffect(() => {
    if (!user || !enabled) return undefined;
    const id = window.setInterval(() => {
      void load({ silent: true });
    }, MASK_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, enabled, load]);

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
          // eslint-disable-next-line visao/no-hardcoded-colors -- cor padrão da máscara é dado persistido no banco, não tema
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
