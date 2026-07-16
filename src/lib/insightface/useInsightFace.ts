/**
 * VISÃO - useInsightFace hook.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { insightFaceClient } from './client';
import type { ArcFaceEmbedding, InsightFaceDetectResult, LivenessResult, MigrationBatchResult } from './types';

interface PersonEmbeddingRow {
  id: string;
  person_id: string;
  embedding: number[];
  model_version: string;
  quality_score: number | null;
}

export function useInsightFace() {
  const qc = useQueryClient();

  const embeddings = useQuery({
    queryKey: ['face_embeddings', 'arcface_r100_v1'],
    queryFn: async (): Promise<PersonEmbeddingRow[]> => {
      const { data, error } = await supabase
        .from('face_embeddings')
        .select('id, person_id, embedding, model_version, quality_score')
        .eq('model_version', 'arcface_r100_v1');
      if (error) throw error;
      return (data ?? []) as PersonEmbeddingRow[];
    },
    staleTime: 60_000,
  });

  const pendingMigration = useQuery({
    queryKey: ['registered_persons', 'pending_migration'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('registered_persons')
        .select('id', { count: 'exact', head: true })
        .neq('encoding_version', 'arcface_r100_v1');
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const detect = useMutation({
    mutationFn: (image: string): Promise<InsightFaceDetectResult> =>
      insightFaceClient.detect(image),
  });

  const encode = useMutation({
    mutationFn: (image: string): Promise<ArcFaceEmbedding> =>
      insightFaceClient.encode(image),
  });

  const liveness = useMutation({
    mutationFn: ({ image, threshold }: { image: string; threshold?: number }): Promise<LivenessResult> =>
      insightFaceClient.liveness(image, threshold),
  });

  const migrateBatch = useMutation({
    mutationFn: (batchSize: number): Promise<MigrationBatchResult> =>
      insightFaceClient.migrateBatch(batchSize),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registered_persons'] });
      qc.invalidateQueries({ queryKey: ['face_embeddings'] });
    },
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['face_embeddings'] });
  }, [qc]);

  return {
    embeddings,
    pendingMigration,
    detect,
    encode,
    liveness,
    migrateBatch,
    invalidate,
  };
}
