/**
 * VISÃO - insightface-analyze
 * Age, gender, emotion, 3D pose from a face crop.
 */
import { runReplicate, corsHeaders, errorResponse, verifyJwt, INSIGHTFACE_MODELS } from '../_shared/replicate.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { AnalyzeSchema, parseBody } from '../_shared/insightface-schemas.ts';

interface AnalyzeOutput {
  age?: number;
  gender?: 'male' | 'female' | 'unknown';
  emotion?: string;
  pose?: { yaw: number; pitch: number; roll: number };
  model_version: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const rl = checkRateLimit(req, RATE_LIMITS.ai, 'insightface-analyze', corsHeaders);
  if (!rl.allowed) return rl.response;
  try {
    const userId = await verifyJwt(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = await parseBody(req, AnalyzeSchema);

    const pred = await runReplicate<Record<string, unknown>>({
      ...INSIGHTFACE_MODELS.analyze,
      input: { image: body.image },
      timeoutMs: 30_000,
    });

    const r = (pred.output ?? {}) as Record<string, unknown>;
    const genderRaw = String(r.gender ?? 'unknown').toLowerCase();
    const gender: AnalyzeOutput['gender'] =
      genderRaw === 'male' || genderRaw === 'm' ? 'male'
      : genderRaw === 'female' || genderRaw === 'f' ? 'female'
      : 'unknown';

    const pose = r.pose as { yaw?: number; pitch?: number; roll?: number } | undefined;

    const out: AnalyzeOutput = {
      age: r.age !== undefined ? Number(r.age) : undefined,
      gender,
      emotion: r.emotion ? String(r.emotion) : undefined,
      pose: pose ? {
        yaw: Number(pose.yaw ?? 0),
        pitch: Number(pose.pitch ?? 0),
        roll: Number(pose.roll ?? 0),
      } : undefined,
      model_version: 'genderage_v1',
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('insightface-analyze failed', err);
    return errorResponse(err);
  }
});
