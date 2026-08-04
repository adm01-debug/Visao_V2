/**
 * Onda 197 — busca de faces pronta para a tela.
 *
 * A leitura é dos fatos (`recognition_logs`, isolado por dono pela RLS) e o
 * julgamento é da régua única {@link runFaceSearch}. Não há agregado pronto no
 * banco justamente para não existir um segundo lugar onde "identificado"
 * pudesse significar outra coisa.
 *
 * Duas decisões deliberadas:
 *
 * 1. **A busca só roda quando pedida.** `enabled` depende de um critério já
 *    aceito; critério recusado não vira consulta — a recusa é mostrada, não
 *    contornada.
 * 2. **O teto de linhas é declarado.** Acima de {@link MAX_ROWS} a resposta é
 *    marcada como truncada e o operador é avisado, em vez de receber uma lista
 *    curta que parece completa.
 */

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeFaceSearchCriteria,
  runFaceSearch,
  summarizeFaceSearch,
  type FaceObservation,
  type FaceSearchCriteria,
  type FaceSearchRejection,
  type FaceSearchResult,
  type FaceSearchSummary,
  type RawFaceSearchCriteria,
} from '@/lib/faces/faceSearch';

/** Teto de leituras por busca. Acima disso o resultado é declarado truncado. */
export const MAX_ROWS = 500;

interface RawRow {
  id: string;
  camera_id: string | null;
  person_id: string | null;
  confidence: number | null;
  recognized: boolean;
  spoof_detected: boolean;
  liveness_score: number | null;
  age_estimated: number | null;
  gender_estimated: string | null;
  image_url: string | null;
  timestamp: string;
}

const toObservation = (row: RawRow): FaceObservation => ({
  id: row.id,
  timestampMs: new Date(row.timestamp).getTime(),
  cameraId: row.camera_id,
  personId: row.person_id,
  similarity: row.confidence === null ? null : Number(row.confidence),
  recognized: row.recognized,
  spoofDetected: row.spoof_detected === true,
  livenessScore: row.liveness_score === null ? null : Number(row.liveness_score),
  ageEstimated: row.age_estimated,
  genderEstimated: row.gender_estimated,
  imageUrl: row.image_url,
});

export interface UseFaceSearchReturn {
  /** Critério aceito atualmente em execução, ou `null` se nenhuma busca foi pedida. */
  criteria: FaceSearchCriteria | null;
  /** Motivo da recusa do último critério submetido. */
  rejection: FaceSearchRejection | null;
  results: FaceSearchResult[];
  summary: FaceSearchSummary;
  truncated: boolean;
  isFetching: boolean;
  error: Error | null;
  submit: (raw: RawFaceSearchCriteria) => void;
  reset: () => void;
}

export function useFaceSearch(): UseFaceSearchReturn {
  const [criteria, setCriteria] = useState<FaceSearchCriteria | null>(null);
  const [rejection, setRejection] = useState<FaceSearchRejection | null>(null);

  const submit = useCallback((raw: RawFaceSearchCriteria) => {
    const normalized = normalizeFaceSearchCriteria(raw, Date.now());
    if (!normalized.ok) {
      setRejection(normalized.reason);
      setCriteria(null);
      return;
    }
    setRejection(null);
    setCriteria(normalized.criteria);
  }, []);

  const reset = useCallback(() => {
    setCriteria(null);
    setRejection(null);
  }, []);

  const query = useQuery({
    queryKey: ['face-search', criteria],
    enabled: criteria !== null,
    staleTime: 30_000,
    queryFn: async (): Promise<RawRow[]> => {
      if (criteria === null) return [];
      let request = supabase
        .from('recognition_logs')
        .select(
          'id, camera_id, person_id, confidence, recognized, spoof_detected, liveness_score, age_estimated, gender_estimated, image_url, timestamp'
        )
        .gte('timestamp', new Date(criteria.fromMs).toISOString())
        .lt('timestamp', new Date(criteria.toMs).toISOString())
        .order('timestamp', { ascending: false })
        .limit(MAX_ROWS + 1);

      if (criteria.cameraIds !== null) {
        request = request.in('camera_id', [...criteria.cameraIds]);
      }
      if (criteria.personIds !== null) {
        request = request.in('person_id', [...criteria.personIds]);
      }

      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as RawRow[];
    },
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const truncated = rows.length > MAX_ROWS;

  const results = useMemo(() => {
    if (criteria === null) return [];
    return runFaceSearch(rows.slice(0, MAX_ROWS).map(toObservation), criteria);
  }, [rows, criteria]);

  const summary = useMemo(() => summarizeFaceSearch(results), [results]);

  return {
    criteria,
    rejection,
    results,
    summary,
    truncated,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error : null,
    submit,
    reset,
  };
}
