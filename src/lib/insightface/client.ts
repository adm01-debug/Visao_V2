/**
 * VISÃO - InsightFace edge-function client wrapper.
 * Handles retries + FunctionsHttpError surfacing.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type {
  InsightFaceDetectResult,
  ArcFaceEmbedding,
  LivenessResult,
  FaceAnalysis,
  MigrationBatchResult,
} from './types';

async function invoke<TIn, TOut>(name: string, body: TIn, retries = 2): Promise<TOut> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke<TOut>(name, { body: body as Record<string, unknown> });
    if (!error && data) return data;

    if (error instanceof FunctionsHttpError) {
      const text = await error.context.text();
      lastErr = new Error(`${name}: ${text}`);
      // 4xx (except 429) — do not retry
      const status = error.context.status;
      if (status && status >= 400 && status < 500 && status !== 429) throw lastErr;
    } else {
      lastErr = error;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${name} failed`);
}

export const insightFaceClient = {
  detect(image: string, maxFaces = 10) {
    return invoke<{ image: string; max_faces: number }, InsightFaceDetectResult>(
      'insightface-detect',
      { image, max_faces: maxFaces },
    );
  },

  encode(image: string, align = true) {
    return invoke<{ image: string; align: boolean }, ArcFaceEmbedding>(
      'insightface-encode',
      { image, align },
    );
  },

  analyze(image: string) {
    return invoke<{ image: string }, FaceAnalysis>('insightface-analyze', { image });
  },

  liveness(image: string, threshold = 0.85) {
    return invoke<{ image: string; threshold: number }, LivenessResult>(
      'insightface-liveness',
      { image, threshold },
    );
  },

  migrateBatch(batchSize = 10, dryRun = false) {
    return invoke<{ batch_size: number; dry_run: boolean }, MigrationBatchResult>(
      'insightface-migrate-batch',
      { batch_size: batchSize, dry_run: dryRun },
    );
  },
};
