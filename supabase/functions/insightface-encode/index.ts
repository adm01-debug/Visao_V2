/**
 * VISÃO - insightface-encode
 * ArcFace r100 embedding (512D) for a single face crop.
 */
import { runReplicate, corsHeaders, errorResponse, verifyJwt, INSIGHTFACE_MODELS } from '../_shared/replicate.ts';

interface EncodeInput { image: string; align?: boolean }
interface EncodeOutput {
  embedding: number[];
  dim: number;
  model_version: string;
  norm: number;
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
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
    const body = (await req.json()) as EncodeInput;
    if (!body.image) throw new Error('[400]: image required');

    const pred = await runReplicate<unknown>({
      ...INSIGHTFACE_MODELS.encode,
      input: { image: body.image, align: body.align ?? true },
      timeoutMs: 30_000,
    });

    // Normalise: output can be `{embedding:[...]}` or bare array.
    const raw = pred.output as Record<string, unknown> | number[] | undefined;
    const embedding = Array.isArray(raw)
      ? (raw as number[])
      : ((raw as { embedding?: number[] })?.embedding ?? []);

    if (!Array.isArray(embedding) || embedding.length !== 512) {
      throw new Error(`[502]: expected 512D embedding, got ${embedding.length}`);
    }

    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    const hash = await sha256(body.image.slice(0, 512));

    const out: EncodeOutput & { source_hash: string } = {
      embedding,
      dim: 512,
      model_version: 'arcface_r100_v1',
      norm,
      source_hash: hash,
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('insightface-encode failed', err);
    return errorResponse(err);
  }
});
