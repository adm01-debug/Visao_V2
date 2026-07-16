/**
 * VISÃO - insightface-liveness
 * Silent Face Anti-Spoofing (MiniFAS).
 */
import { runReplicate, corsHeaders, errorResponse, verifyJwt, INSIGHTFACE_MODELS } from '../_shared/replicate.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { LivenessSchema, parseBody } from '../_shared/insightface-schemas.ts';

interface LivenessOutput {
  is_live: boolean;
  score: number;
  threshold: number;
  model_version: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const rl = checkRateLimit(req, RATE_LIMITS.ai, 'insightface-liveness', corsHeaders);
  if (!rl.allowed) return rl.response;
  try {
    const userId = await verifyJwt(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = await parseBody(req, LivenessSchema);
    const threshold = body.threshold ?? 0.85;

    const pred = await runReplicate<Record<string, unknown> | number>({
      ...INSIGHTFACE_MODELS.liveness,
      input: { image: body.image },
      timeoutMs: 30_000,
    });

    const raw = pred.output;
    const score = typeof raw === 'number'
      ? raw
      : Number((raw as { score?: number; live_score?: number })?.score
          ?? (raw as { live_score?: number })?.live_score ?? 0);

    const out: LivenessOutput = {
      is_live: score >= threshold,
      score,
      threshold,
      model_version: 'silent_face_v1',
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('insightface-liveness failed', err);
    return errorResponse(err);
  }
});
