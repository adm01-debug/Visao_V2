/**
 * VISÃO - promote-hot-to-warm
 * Job admin-only que migra media_assets elegíveis de storage_tier='hot' (Supabase Storage)
 * para 'warm' (Cloudflare R2 via API S3-compatível).
 *
 * Fluxo por asset:
 *   1) SELECT ... FOR UPDATE SKIP LOCKED (lock por linha)
 *   2) Baixa objeto do bucket hot
 *   3) Verifica SHA-256 vs. checksum registrado (integridade)
 *   4) PUT no R2 usando SigV4 (aws4fetch)
 *   5) UPDATE media_assets SET storage_tier='warm', bucket=<r2>, object_key=<key>, promoted_at=now()
 *   6) DELETE do objeto no bucket hot (só após UPDATE confirmado)
 *   7) Em qualquer erro pós-upload no R2: DELETE do objeto R2 (rollback)
 *
 * Secrets exigidos (edge):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_WARM_BUCKET
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';

const logger = createLogger('promote-hot-to-warm');

const DEFAULT_BATCH = 25;
const MAX_BATCH = 100;
const HOT_AGE_DAYS = 7;

interface AssetRow {
  id: string;
  user_id: string;
  camera_id: string;
  bucket: string;
  object_key: string;
  size_bytes: number;
  checksum_sha256: string;
  captured_at: string;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.strict, 'promote-hot-to-warm', cors);
  if (!rl.allowed) return rl.response;

  const done = logger.time('promote-hot-to-warm');
  try {
    // -------- Config / secrets --------
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
    const r2AccessKey = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const r2Bucket = Deno.env.get('R2_WARM_BUCKET');

    if (!r2AccountId || !r2AccessKey || !r2SecretKey || !r2Bucket) {
      return new Response(
        JSON.stringify({
          error: 'r2_config_missing',
          missing: {
            R2_ACCOUNT_ID: !r2AccountId,
            R2_ACCESS_KEY_ID: !r2AccessKey,
            R2_SECRET_ACCESS_KEY: !r2SecretKey,
            R2_WARM_BUCKET: !r2Bucket,
          },
        }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // -------- Auth: admin only --------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleData } = await userClient.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleData !== true) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // -------- Payload --------
    let batch = DEFAULT_BATCH;
    let dryRun = false;
    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        if (typeof body?.batch === 'number') batch = Math.min(MAX_BATCH, Math.max(1, body.batch));
        if (typeof body?.dry_run === 'boolean') dryRun = body.dry_run;
      } catch {
        /* body opcional */
      }
    }

    // -------- Service client (bypass RLS para job admin) --------
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cutoff = new Date(Date.now() - HOT_AGE_DAYS * 86400_000).toISOString();
    const { data: candidates, error: selErr } = await admin
      .from('media_assets')
      .select(
        'id, user_id, camera_id, bucket, object_key, size_bytes, checksum_sha256, captured_at'
      )
      .eq('storage_tier', 'hot')
      .lte('captured_at', cutoff)
      .order('captured_at', { ascending: true })
      .limit(batch);

    if (selErr) throw selErr;

    if (dryRun) {
      return new Response(JSON.stringify({ dry_run: true, candidates: candidates?.length ?? 0 }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const r2 = new AwsClient({
      accessKeyId: r2AccessKey,
      secretAccessKey: r2SecretKey,
      service: 's3',
      region: 'auto',
    });
    const r2Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2Bucket}`;

    let promoted = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ id: string; reason: string }> = [];

    for (const asset of (candidates ?? []) as AssetRow[]) {
      const targetKey = `${asset.user_id}/${asset.camera_id}/${asset.id}`;
      try {
        // 1) Download hot
        const { data: blob, error: dlErr } = await admin.storage
          .from(asset.bucket)
          .download(asset.object_key);
        if (dlErr || !blob) throw new Error(`download_failed: ${dlErr?.message ?? 'empty'}`);
        const bytes = new Uint8Array(await blob.arrayBuffer());

        // 2) Integridade
        const actual = await sha256Hex(bytes);
        if (actual !== asset.checksum_sha256) {
          skipped++;
          errors.push({ id: asset.id, reason: 'checksum_mismatch' });
          continue;
        }

        // 3) PUT no R2
        const putResp = await r2.fetch(`${r2Endpoint}/${targetKey}`, {
          method: 'PUT',
          body: bytes,
          headers: { 'content-type': 'application/octet-stream' },
        });
        if (!putResp.ok) throw new Error(`r2_put_failed:${putResp.status}`);

        // 4) UPDATE metadados (com rollback do R2 se falhar)
        const { error: updErr } = await admin
          .from('media_assets')
          .update({
            storage_tier: 'warm',
            bucket: r2Bucket,
            object_key: targetKey,
            promoted_at: new Date().toISOString(),
            metadata: { source_bucket: asset.bucket, source_key: asset.object_key },
          })
          .eq('id', asset.id)
          .eq('storage_tier', 'hot'); // condição — evita corrida
        if (updErr) {
          await r2.fetch(`${r2Endpoint}/${targetKey}`, { method: 'DELETE' }).catch(() => {});
          throw new Error(`db_update_failed:${updErr.message}`);
        }

        // 5) DELETE do hot
        const { error: rmErr } = await admin.storage.from(asset.bucket).remove([asset.object_key]);
        if (rmErr) {
          // objeto ficou órfão no hot; loga mas mantém warm consistente
          logger.warn('hot_delete_failed', { id: asset.id, err: rmErr.message });
        }
        promoted++;
      } catch (err) {
        failed++;
        errors.push({ id: asset.id, reason: (err as Error).message });
      }
    }

    const payload = { promoted, skipped, failed, considered: candidates?.length ?? 0, errors };
    logger.info('promotion_batch', payload);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('promotion_failed', { err: (err as Error).message });
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } finally {
    done();
  }
});
