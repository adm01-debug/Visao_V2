/**
 * VISÃO - useModelThresholds
 *
 * Gerencia limiares de confiança/qualidade por tipo de risco e modelo.
 * Os thresholds são consultados pelos pipelines de detecção para filtrar
 * resultados (ex.: face_recognition_configs.match_threshold) — esta tabela
 * fornece o valor canônico do usuário.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ModelThreshold {
  id: string;
  user_id: string;
  risk_type: string;
  model_name: string;
  min_confidence: number;
  min_quality: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThresholdInput {
  risk_type: string;
  model_name?: string;
  min_confidence: number;
  min_quality?: number | null;
  notes?: string | null;
}

/** Catálogo padrão de tipos de risco com defaults sugeridos. */
export const RISK_TYPE_PRESETS: Array<{
  key: string;
  label: string;
  description: string;
  defaultModel: string;
  defaultMinConfidence: number;
  supportsQuality?: boolean;
}> = [
  {
    key: 'security',
    label: 'Segurança Geral',
    description: 'Detecções gerais de segurança (intrusão, perímetro, comportamento suspeito).',
    defaultModel: 'gemini-vision',
    defaultMinConfidence: 0.7,
  },
  {
    key: 'face_recognition',
    label: 'Reconhecimento Facial',
    description: 'Match de faces conhecidas vs. desconhecidas.',
    defaultModel: 'face-api',
    defaultMinConfidence: 0.6,
    supportsQuality: true,
  },
  {
    key: 'license_plate',
    label: 'Placa Veicular (ALPR)',
    description: 'Leitura automática de placas de veículos.',
    defaultModel: 'alpr',
    defaultMinConfidence: 0.85,
  },
  {
    key: 'ppe',
    label: 'EPI (PPE)',
    description: 'Detecção de capacete, colete, máscara, óculos, etc.',
    defaultModel: 'coco-ssd',
    defaultMinConfidence: 0.6,
  },
  {
    key: 'behavior',
    label: 'Comportamento',
    description: 'Padrões anômalos: queda, briga, ausência prolongada, aglomeração.',
    defaultModel: 'detect-behavior',
    defaultMinConfidence: 0.7,
  },
  {
    key: 'object_detection',
    label: 'Objetos Genéricos',
    description: 'Detecção de pessoas, veículos e objetos via COCO-SSD.',
    defaultModel: 'coco-ssd',
    defaultMinConfidence: 0.5,
  },
];

export function useModelThresholds() {
  const { user } = useAuth();
  const [thresholds, setThresholds] = useState<ModelThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setThresholds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('model_thresholds' as never)
      .select('*')
      .order('risk_type', { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setThresholds((data ?? []) as unknown as ModelThreshold[]);
    setError(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const upsertThreshold = useCallback(
    async (input: ThresholdInput): Promise<ModelThreshold | null> => {
      if (!user) return null;
      const payload = {
        user_id: user.id,
        risk_type: input.risk_type,
        model_name: input.model_name ?? 'default',
        min_confidence: input.min_confidence,
        min_quality: input.min_quality ?? null,
        notes: input.notes ?? null,
      };
      const { data, error: err } = await (supabase
        .from('model_thresholds' as never) as unknown as {
          upsert: (p: unknown, opts: { onConflict: string }) => {
            select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
          };
        })
        .upsert(payload, { onConflict: 'user_id,risk_type,model_name' })
        .select()
        .single();
      if (err) {
        toast.error(`Falha ao salvar threshold: ${err.message}`);
        return null;
      }
      const saved = data as unknown as ModelThreshold;
      setThresholds((prev) => {
        const idx = prev.findIndex(
          (t) => t.risk_type === saved.risk_type && t.model_name === saved.model_name,
        );
        if (idx === -1) return [...prev, saved].sort((a, b) => a.risk_type.localeCompare(b.risk_type));
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      return saved;
    },
    [user],
  );

  const resetToDefault = useCallback(
    async (risk_type: string): Promise<void> => {
      const preset = RISK_TYPE_PRESETS.find((p) => p.key === risk_type);
      if (!preset) return;
      await upsertThreshold({
        risk_type,
        model_name: preset.defaultModel,
        min_confidence: preset.defaultMinConfidence,
      });
      toast.success(`Threshold de "${preset.label}" restaurado ao padrão`);
    },
    [upsertThreshold],
  );

  /** Mapa rápido por risk_type → threshold (primeiro modelo encontrado). */
  const byRisk = useMemo(() => {
    const map = new Map<string, ModelThreshold>();
    for (const t of thresholds) {
      if (!map.has(t.risk_type)) map.set(t.risk_type, t);
    }
    return map;
  }, [thresholds]);

  const getThresholdFor = useCallback(
    (risk_type: string): { min_confidence: number; min_quality: number | null; isDefault: boolean } => {
      const stored = byRisk.get(risk_type);
      if (stored) {
        return {
          min_confidence: stored.min_confidence,
          min_quality: stored.min_quality,
          isDefault: false,
        };
      }
      const preset = RISK_TYPE_PRESETS.find((p) => p.key === risk_type);
      return {
        min_confidence: preset?.defaultMinConfidence ?? 0.7,
        min_quality: null,
        isDefault: true,
      };
    },
    [byRisk],
  );

  return {
    thresholds,
    loading,
    error,
    upsertThreshold,
    resetToDefault,
    getThresholdFor,
    byRisk,
    refetch: fetchAll,
  };
}
