/**
 * VISÃO - insightface-migrate-batch
 * Re-encodes registered_persons training photos into 512D ArcFace embeddings.
 * Idempotent per person via `encoding_migrated_at`.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  runReplicate,
  corsHeaders,
  errorResponse,
  verifyJwt,
  INSIGHTFACE_MODELS,
} from '../_shared/replicate.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { MigrateBatchSchema, parseBody } from '../_shared/insightface-schemas.ts';

interface MigrateOutput {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  errors: Array<{ person_id: string; message: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, 'insightface-migrate-batch', corsHeaders);
  if (!rl.allowed) return rl.response;
  try {
    const userId = await verifyJwt(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Empty body is allowed for this endpoint; parse only if non-empty.
    const raw = await req.text();
    const body = raw.trim().length
      ? await parseBody(new Request(req.url, { method: 'POST', body: raw }), MigrateBatchSchema)
      : {};
    const batchSize = body.batch_size ?? 10;
    const dryRun = body.dry_run ?? false;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch pending persons (owned by caller only — respect isolation).
    const { data: persons, error: fetchErr } = await admin
      .from('registered_persons')
      .select('id, user_id, name, photo_url, training_photos, encoding_version')
      .eq('user_id', userId)
      .neq('encoding_version', 'arcface_r100_v1')
      .limit(batchSize);

    if (fetchErr) throw new Error(`[500]: ${fetchErr.message}`);

    const out: MigrateOutput = {
      processed: persons?.length ?? 0,
      succeeded: 0,
      failed: 0,
      remaining: 0,
      errors: [],
    };

    if (!persons || persons.length === 0) {
      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const person of persons) {
      try {
        const photos = [person.photo_url, ...(person.training_photos ?? [])].filter(
          Boolean
        ) as string[];
        if (photos.length === 0) throw new Error('no photos');

        if (dryRun) {
          out.succeeded += 1;
          continue;
        }

        // Encode first available photo (production would encode all + average).
        const pred = await runReplicate<Record<string, unknown> | number[]>({
          ...INSIGHTFACE_MODELS.encode,
          input: { image: photos[0], align: true },
          timeoutMs: 30_000,
        });
        const raw = pred.output;
        const embedding = Array.isArray(raw)
          ? (raw as number[])
          : ((raw as { embedding?: number[] })?.embedding ?? []);
        if (embedding.length !== 512) throw new Error(`bad embedding dim ${embedding.length}`);

        const { error: insErr } = await admin.from('face_embeddings').insert({
          person_id: person.id,
          user_id: person.user_id,
          model_version: 'arcface_r100_v1',
          embedding_dim: 512,
          embedding,
          source_photo_url: photos[0],
        });
        if (insErr) throw new Error(insErr.message);

        const { error: updErr } = await admin
          .from('registered_persons')
          .update({
            encoding_version: 'arcface_r100_v1',
            encoding_migrated_at: new Date().toISOString(),
          })
          .eq('id', person.id);
        if (updErr) throw new Error(updErr.message);

        out.succeeded += 1;
      } catch (err) {
        out.failed += 1;
        out.errors.push({
          person_id: person.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Remaining count
    const { count } = await admin
      .from('registered_persons')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('encoding_version', 'arcface_r100_v1');
    out.remaining = count ?? 0;

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('insightface-migrate-batch failed', err);
    return errorResponse(err);
  }
});
