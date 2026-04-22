/**
 * VISÃO - useDetectionReviews
 *
 * Gerencia revisões humanas de detecções (true/false positives/negatives).
 * Suporta upsert (uma revisão por par source_table+source_id por usuário)
 * e expõe estatísticas agregadas por tipo de risco.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ReviewVerdict = 'true_positive' | 'false_positive' | 'false_negative' | 'uncertain';
export type SourceTable = 'alerts' | 'recognition_logs' | 'plate_detections';

export interface DetectionReview {
  id: string;
  user_id: string;
  source_table: SourceTable;
  source_id: string;
  camera_id: string | null;
  camera_name: string | null;
  risk_type: string;
  model_name: string | null;
  verdict: ReviewVerdict;
  original_confidence: number | null;
  notes: string | null;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewInput {
  source_table: SourceTable;
  source_id: string;
  camera_id?: string | null;
  camera_name?: string | null;
  risk_type: string;
  model_name?: string | null;
  verdict: ReviewVerdict;
  original_confidence?: number | null;
  notes?: string | null;
}

export interface ReviewStatsByRisk {
  risk_type: string;
  total: number;
  true_positive: number;
  false_positive: number;
  false_negative: number;
  uncertain: number;
  precision: number; // TP / (TP + FP)
  recall: number; // TP / (TP + FN)
  avgConfidence: number | null;
}

export function useDetectionReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<DetectionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('detection_reviews' as never)
      .select('*')
      .order('reviewed_at', { ascending: false })
      .limit(1000);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setReviews((data ?? []) as unknown as DetectionReview[]);
    setError(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const upsertReview = useCallback(
    async (input: ReviewInput): Promise<DetectionReview | null> => {
      if (!user) return null;
      const payload = {
        ...input,
        user_id: user.id,
        reviewed_at: new Date().toISOString(),
      };
      const { data, error: err } = await (supabase
        .from('detection_reviews' as never) as unknown as {
          upsert: (p: unknown, opts: { onConflict: string }) => {
            select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
          };
        })
        .upsert(payload, { onConflict: 'user_id,source_table,source_id' })
        .select()
        .single();
      if (err) {
        toast.error(`Falha ao salvar avaliação: ${err.message}`);
        return null;
      }
      const saved = data as unknown as DetectionReview;
      setReviews((prev) => {
        const idx = prev.findIndex(
          (r) => r.source_table === saved.source_table && r.source_id === saved.source_id,
        );
        if (idx === -1) return [saved, ...prev];
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      toast.success('Avaliação registrada');
      return saved;
    },
    [user],
  );

  const removeReview = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('detection_reviews' as never)
      .delete()
      .eq('id', id);
    if (err) {
      toast.error(`Falha ao remover avaliação: ${err.message}`);
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast.success('Avaliação removida');
  }, []);

  /** Mapa rápido por (source_table, source_id) → review. */
  const reviewMap = useMemo(() => {
    const map = new Map<string, DetectionReview>();
    for (const r of reviews) map.set(`${r.source_table}:${r.source_id}`, r);
    return map;
  }, [reviews]);

  const getReviewFor = useCallback(
    (source_table: SourceTable, source_id: string): DetectionReview | undefined =>
      reviewMap.get(`${source_table}:${source_id}`),
    [reviewMap],
  );

  /** Estatísticas agregadas por risk_type. */
  const statsByRisk = useMemo<ReviewStatsByRisk[]>(() => {
    const grouped = new Map<string, DetectionReview[]>();
    for (const r of reviews) {
      const arr = grouped.get(r.risk_type) ?? [];
      arr.push(r);
      grouped.set(r.risk_type, arr);
    }
    const out: ReviewStatsByRisk[] = [];
    for (const [risk_type, items] of grouped) {
      const counts = { true_positive: 0, false_positive: 0, false_negative: 0, uncertain: 0 };
      let confSum = 0;
      let confCount = 0;
      for (const r of items) {
        counts[r.verdict] += 1;
        if (typeof r.original_confidence === 'number') {
          confSum += r.original_confidence;
          confCount += 1;
        }
      }
      const tp = counts.true_positive;
      const fp = counts.false_positive;
      const fn = counts.false_negative;
      out.push({
        risk_type,
        total: items.length,
        ...counts,
        precision: tp + fp > 0 ? tp / (tp + fp) : 0,
        recall: tp + fn > 0 ? tp / (tp + fn) : 0,
        avgConfidence: confCount > 0 ? confSum / confCount : null,
      });
    }
    return out.sort((a, b) => b.total - a.total);
  }, [reviews]);

  return {
    reviews,
    loading,
    error,
    upsertReview,
    removeReview,
    getReviewFor,
    statsByRisk,
    refetch: fetchAll,
  };
}
