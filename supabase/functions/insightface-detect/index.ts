/**
 * VISÃO - insightface-detect
 * RetinaFace detection: returns bboxes + 5 landmarks + scores.
 */
import { runReplicate, corsHeaders, errorResponse, verifyJwt, INSIGHTFACE_MODELS } from '../_shared/replicate.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { DetectSchema, parseBody } from '../_shared/insightface-schemas.ts';

interface DetectOutput {
  faces: Array<{
    bbox: [number, number, number, number];
    score: number;
    landmarks: Array<[number, number]>;
  }>;
  model_version: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const rl = checkRateLimit(req, RATE_LIMITS.ai, 'insightface-detect', corsHeaders);
  if (!rl.allowed) return rl.response;
  try {
    const userId = await verifyJwt(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = await parseBody(req, DetectSchema);

    const pred = await runReplicate<unknown>({
      ...INSIGHTFACE_MODELS.detect,
      input: { image: body.image, max_faces: body.max_faces ?? 10 },
      timeoutMs: 30_000,
    });

    // Replicate output shapes vary; normalise defensively.
    const raw = pred.output as Record<string, unknown> | Array<unknown> | undefined;
    const faces = Array.isArray(raw) ? raw : (raw as { faces?: unknown[] })?.faces ?? [];
    const normalised = (faces as Array<Record<string, unknown>>).map((f) => ({
      bbox: (f.bbox ?? f.box) as [number, number, number, number],
      score: Number(f.score ?? f.confidence ?? 0),
      landmarks: (f.landmarks ?? f.kps ?? []) as Array<[number, number]>,
    }));

    const out: DetectOutput = {
      faces: normalised,
      model_version: 'retinaface_r50_v1',
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('insightface-detect failed', err);
    return errorResponse(err);
  }
});
