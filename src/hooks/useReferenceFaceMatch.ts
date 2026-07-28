/**
 * Onda 198 — comparação 1:N por imagem de referência, pronta para a tela.
 *
 * A extração do vetor é do serviço de encoding; a galeria vem de
 * `face_embeddings` (isolada por dono pela RLS). O julgamento é sempre da
 * régua única {@link matchReference} — aqui não há segunda definição de
 * "identificado".
 */

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { insightFaceClient } from '@/lib/insightface/client';
import {
  DEFAULT_MATCH_THRESHOLD,
  matchReference,
  type GalleryEntry,
  type ReferenceMatchOutcome,
  type ReferenceMatchRejection,
} from '@/lib/faces/referenceMatch';

/** Teto de cadastros carregados por comparação. */
export const MAX_GALLERY = 2000;

interface EmbeddingRow {
  id: string;
  person_id: string;
  embedding: unknown;
  model_version: string;
  quality_score: number | null;
}

interface PersonRow {
  id: string;
  name: string | null;
}

const toVector = (raw: unknown): number[] => {
  if (Array.isArray(raw)) return raw.map((v) => Number(v));
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((v) => Number(v)) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export interface UseReferenceFaceMatchReturn {
  outcome: ReferenceMatchOutcome | null;
  rejection: ReferenceMatchRejection | null;
  error: Error | null;
  isEncoding: boolean;
  isGalleryLoading: boolean;
  galleryCount: number;
  threshold: number;
  setThreshold: (value: number) => void;
  /** Recebe a imagem em base64 (data URL ou puro) e executa a comparação. */
  compare: (imageBase64: string) => Promise<void>;
  reset: () => void;
}

export function useReferenceFaceMatch(): UseReferenceFaceMatchReturn {
  const [threshold, setThreshold] = useState(DEFAULT_MATCH_THRESHOLD);
  const [outcome, setOutcome] = useState<ReferenceMatchOutcome | null>(null);
  const [rejection, setRejection] = useState<ReferenceMatchRejection | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);

  const galleryQuery = useQuery({
    queryKey: ['face-reference-gallery'],
    staleTime: 60_000,
    queryFn: async (): Promise<GalleryEntry[]> => {
      const { data, error: embErr } = await supabase
        .from('face_embeddings')
        .select('id, person_id, embedding, model_version, quality_score')
        .limit(MAX_GALLERY);
      if (embErr) throw embErr;
      const rows = (data ?? []) as unknown as EmbeddingRow[];

      const personIds = [...new Set(rows.map((r) => r.person_id))];
      const names = new Map<string, string | null>();
      if (personIds.length > 0) {
        const { data: people } = await supabase
          .from('registered_persons')
          .select('id, name')
          .in('id', personIds);
        for (const p of (people ?? []) as unknown as PersonRow[]) names.set(p.id, p.name);
      }

      return rows.map((r) => ({
        id: r.id,
        personId: r.person_id,
        personName: names.get(r.person_id) ?? null,
        embedding: toVector(r.embedding),
        modelVersion: r.model_version,
        qualityScore: r.quality_score,
      }));
    },
  });

  const gallery = useMemo(() => galleryQuery.data ?? [], [galleryQuery.data]);

  const compare = useCallback(
    async (imageBase64: string) => {
      setError(null);
      setRejection(null);
      setOutcome(null);
      setIsEncoding(true);
      try {
        const encoded = await insightFaceClient.encode(imageBase64);
        const result = matchReference(
          {
            embedding: encoded.embedding,
            modelVersion: encoded.model_version,
          },
          gallery,
          threshold,
        );
        if (result.ok) setOutcome(result.outcome);
        else setRejection(result.reason);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Falha ao comparar a imagem.'));
      } finally {
        setIsEncoding(false);
      }
    },
    [gallery, threshold],
  );

  const reset = useCallback(() => {
    setOutcome(null);
    setRejection(null);
    setError(null);
  }, []);

  return {
    outcome,
    rejection,
    error,
    isEncoding,
    isGalleryLoading: galleryQuery.isLoading,
    galleryCount: gallery.length,
    threshold,
    setThreshold,
    compare,
    reset,
  };
}
