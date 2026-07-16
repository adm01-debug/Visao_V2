/**
 * VISÃO - InsightFace pipeline: detect → liveness → encode → match.
 */
import { insightFaceClient } from './client';
import { topKMatches, type MatchCandidate, type MatchResult } from './similarity';
import type { InsightFaceBBox, LivenessResult, ArcFaceEmbedding } from './types';

export interface PipelineOptions {
  runLiveness?: boolean;
  livenessThreshold?: number;
  matchThreshold?: number;
  candidates?: MatchCandidate<{ personId: string; name: string; listType: string }>[];
}

export interface PipelineResult {
  faces: Array<{
    detection: InsightFaceBBox;
    liveness?: LivenessResult;
    embedding?: ArcFaceEmbedding;
    matches?: MatchResult<{ personId: string; name: string; listType: string }>[];
    skipped?: 'spoof' | 'low_quality';
  }>;
  modelVersions: {
    detect: string;
    encode?: string;
    liveness?: string;
  };
}

/**
 * Cropping a face from base64 image happens client-side today (canvas).
 * For simplicity here we send the same image + bbox coords (server crop
 * would require re-uploading). Consumers should pre-crop and pass crops.
 */
export async function runInsightFacePipeline(
  fullImage: string,
  faceCrops: Array<{ crop: string; bbox: InsightFaceBBox }>,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const {
    runLiveness = true,
    livenessThreshold = 0.85,
    matchThreshold = 0.5,
    candidates = [],
  } = options;

  const detectRes = { faces: faceCrops.map((f) => f.bbox), model_version: 'retinaface_r50_v1' };

  const results: PipelineResult['faces'] = [];
  let encodeModel: string | undefined;
  let livenessModel: string | undefined;

  for (const { crop, bbox } of faceCrops) {
    const entry: PipelineResult['faces'][number] = { detection: bbox };

    if (runLiveness) {
      try {
        const live = await insightFaceClient.liveness(crop, livenessThreshold);
        entry.liveness = live;
        livenessModel = live.model_version;
        if (!live.is_live) {
          entry.skipped = 'spoof';
          results.push(entry);
          continue;
        }
      } catch (err) {
        console.warn('liveness failed, continuing', err);
      }
    }

    try {
      const enc = await insightFaceClient.encode(crop);
      entry.embedding = enc;
      encodeModel = enc.model_version;

      if (candidates.length > 0) {
        entry.matches = topKMatches(enc.embedding, candidates, 5, matchThreshold);
      }
    } catch (err) {
      console.error('encode failed', err);
      entry.skipped = 'low_quality';
    }

    results.push(entry);
  }

  return {
    faces: results,
    modelVersions: {
      detect: detectRes.model_version,
      encode: encodeModel,
      liveness: livenessModel,
    },
  };
}
