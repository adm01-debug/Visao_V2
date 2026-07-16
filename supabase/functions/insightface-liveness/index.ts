/**
 * VISÃO - insightface-liveness
 * Silent Face Anti-Spoofing (MiniFAS).
 */
import { runReplicate, corsHeaders, errorResponse, verifyJwt, INSIGHTFACE_MODELS } from '../_shared/replicate.ts';

interface LivenessInput { image: string; threshold?: number }
interface LivenessOutput {
  is_live: boolean;
  score: number;
  threshold: number;
  model_version: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await verifyJwt(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = (await req.json()) as LivenessInput;
    if (!body.image) throw new Error('[400]: image required');
    const threshold = Math.min(0.99, Math.max(0.5, body.threshold ?? 0.85));

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
