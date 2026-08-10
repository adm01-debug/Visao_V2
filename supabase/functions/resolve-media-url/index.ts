/**
 * VISÃO — resolve-media-url
 * Serviço unificado de playback que emite URL assinada para media_assets nos 3 tiers:
 *   - hot  → Supabase Storage (createSignedUrl)
 *   - warm → Cloudflare R2 (SigV4 GET presign)
 *   - cold → AWS S3 Glacier Deep Archive:
 *              * available   → SigV4 GET presign
 *              * in_progress → 202 { status:'restore_in_progress', ready_at? }
 *              * none/expired → dispara RestoreObject (Bulk 12h/Expedited 5min)
 *
 * Segurança:
 *   - verify_jwt=true (via config.toml)
 *   - Autorização RLS: owner OU has_role(admin)
 *   - Rate limit por usuário
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';

const logger = createLogger('resolve-media-url');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const _ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_KEY = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET = Deno.env.get('R2_WARM_BUCKET');

const AWS_KEY = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const AWS_REGION = Deno.env.get('AWS_REGION') ?? 'us-east-1';
const S3_COLD_BUCKET = Deno.env.get('S3_COLD_BUCKET');

const SIGNED_URL_TTL = 900; // 15 min

interface AssetRow {
  id: string;
  user_id: string;
  bucket: string;
  object_key: string;
  storage_tier: 'hot' | 'warm' | 'cold';
  restore_status: 'none' | 'in_progress' | 'available' | 'expired';
  restore_expires_at: string | null;
  restore_requested_at: string | null;
  legal_hold: boolean;
}

async function presignR2(objectKey: string): Promise<string> {
  if (!R2_ACCOUNT_ID || !R2_KEY || !R2_SECRET || !R2_BUCKET) {
    throw new Error('r2_not_configured');
  }
  const aws = new AwsClient({
    accessKeyId: R2_KEY,
    secretAccessKey: R2_SECRET,
    service: 's3',
    region: 'auto',
  });
  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${objectKey}?X-Amz-Expires=${SIGNED_URL_TTL}`;
  const signed = await aws.sign(new Request(url, { method: 'GET' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

async function presignS3(objectKey: string): Promise<string> {
  if (!AWS_KEY || !AWS_SECRET || !S3_COLD_BUCKET) throw new Error('s3_not_configured');
  const aws = new AwsClient({
    accessKeyId: AWS_KEY,
    secretAccessKey: AWS_SECRET,
    service: 's3',
    region: AWS_REGION,
  });
  const url = `https://${S3_COLD_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${objectKey}?X-Amz-Expires=${SIGNED_URL_TTL}`;
  const signed = await aws.sign(new Request(url, { method: 'GET' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

async function initiateGlacierRestore(
  objectKey: string,
  tier: 'Bulk' | 'Expedited'
): Promise<void> {
  if (!AWS_KEY || !AWS_SECRET || !S3_COLD_BUCKET) throw new Error('s3_not_configured');
  const aws = new AwsClient({
    accessKeyId: AWS_KEY,
    secretAccessKey: AWS_SECRET,
    service: 's3',
    region: AWS_REGION,
  });
  const body = `<RestoreRequest xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Days>7</Days><GlacierJobParameters><Tier>${tier}</Tier></GlacierJobParameters></RestoreRequest>`;
  const url = `https://${S3_COLD_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${objectKey}?restore`;
  const res = await aws.fetch(url, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/xml' },
  });
  if (!res.ok && res.status !== 202 && res.status !== 409) {
    const text = await res.text();
    throw new Error(`glacier_restore_failed:${res.status}:${text}`);
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: userData } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const rl = await checkRateLimit(user.id, RATE_LIMITS.default);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: { asset_id?: string; restore_tier?: 'Bulk' | 'Expedited' };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!body.asset_id) {
    return new Response(JSON.stringify({ error: 'asset_id_required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { data: asset, error } = await admin
    .from('media_assets')
    .select(
      'id,user_id,bucket,object_key,storage_tier,restore_status,restore_expires_at,restore_requested_at,legal_hold'
    )
    .eq('id', body.asset_id)
    .maybeSingle<AssetRow>();

  if (error) {
    logger.error('db_error', { error: error.message });
    return new Response(JSON.stringify({ error: 'db_error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  if (!asset) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Authorization: owner or admin
  if (asset.user_id !== user.id) {
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    if (asset.storage_tier === 'hot') {
      const { data, error: sErr } = await admin.storage
        .from(asset.bucket)
        .createSignedUrl(asset.object_key, SIGNED_URL_TTL);
      if (sErr || !data?.signedUrl) throw new Error(sErr?.message ?? 'sign_failed');
      return new Response(
        JSON.stringify({
          status: 'ready',
          tier: 'hot',
          url: data.signedUrl,
          expires_in: SIGNED_URL_TTL,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    if (asset.storage_tier === 'warm') {
      const url = await presignR2(asset.object_key);
      return new Response(
        JSON.stringify({ status: 'ready', tier: 'warm', url, expires_in: SIGNED_URL_TTL }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // cold
    const now = Date.now();
    const expired =
      asset.restore_status === 'expired' ||
      (asset.restore_status === 'available' &&
        asset.restore_expires_at &&
        new Date(asset.restore_expires_at).getTime() < now);

    if (asset.restore_status === 'available' && !expired) {
      const url = await presignS3(asset.object_key);
      return new Response(
        JSON.stringify({ status: 'ready', tier: 'cold', url, expires_in: SIGNED_URL_TTL }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    if (asset.restore_status === 'in_progress') {
      return new Response(
        JSON.stringify({
          status: 'restore_in_progress',
          tier: 'cold',
          requested_at: asset.restore_requested_at,
        }),
        { status: 202, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // none or expired → iniciar restore
    const restoreTier = body.restore_tier === 'Expedited' ? 'Expedited' : 'Bulk';
    await initiateGlacierRestore(asset.object_key, restoreTier);
    await admin
      .from('media_assets')
      .update({
        restore_status: 'in_progress',
        restore_requested_at: new Date().toISOString(),
        restore_expires_at: null,
      })
      .eq('id', asset.id);

    return new Response(
      JSON.stringify({
        status: 'restore_initiated',
        tier: 'cold',
        restore_tier: restoreTier,
        eta_hours: restoreTier === 'Expedited' ? 0.1 : 12,
      }),
      { status: 202, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = (err as Error).message;
    logger.error('resolve_failed', { asset_id: asset.id, tier: asset.storage_tier, message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
