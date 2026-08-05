// Edge Function: forget-user-media
// LGPD — Direito ao Esquecimento. Hard-delete cascateado nos 3 tiers (Hot/Warm/Cold),
// respeitando legal_hold, com trilha de auditoria imutável.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';
import { getCorsHeaders } from '../_shared/cors.ts';

interface ForgetPayload {
  subject_user_id: string;
  reason: string;
  dry_run?: boolean;
  batch_size?: number;
}

interface MediaAssetRow {
  id: string;
  user_id: string;
  storage_tier: 'hot' | 'warm' | 'cold';
  storage_bucket: string | null;
  storage_key: string | null;
  legal_hold: boolean | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_WARM_BUCKET = Deno.env.get('R2_WARM_BUCKET');
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const AWS_REGION = Deno.env.get('AWS_REGION');
const S3_COLD_BUCKET = Deno.env.get('S3_COLD_BUCKET');

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401, cors);
    }

    // Cliente com o token do chamador para descobrir quem é
    const asUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401, cors);
    const caller = userData.user;

    // Cliente admin (service role) para operações de esquecimento
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Verifica papel admin via RPC has_role
    const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin',
    });
    if (roleErr) return json({ error: 'role_check_failed', details: roleErr.message }, 500, cors);

    const payload = (await req.json().catch(() => ({}))) as ForgetPayload;
    if (!payload.subject_user_id || !payload.reason || payload.reason.length < 8) {
      return json({ error: 'invalid_payload' }, 400, cors);
    }

    // Autorização: admin OU o próprio titular
    if (!isAdmin && caller.id !== payload.subject_user_id) {
      return json({ error: 'forbidden' }, 403, cors);
    }

    const batchSize = Math.min(Math.max(payload.batch_size ?? 200, 1), 500);
    const dryRun = payload.dry_run === true;

    // Busca ativos do titular
    const { data: assets, error: assetsErr } = await admin
      .from('media_assets')
      .select('id,user_id,storage_tier,storage_bucket,storage_key,legal_hold')
      .eq('user_id', payload.subject_user_id)
      .limit(batchSize);

    if (assetsErr) return json({ error: 'query_failed', details: assetsErr.message }, 500, cors);

    const rows = (assets ?? []) as MediaAssetRow[];
    const counters = { hot: 0, warm: 0, cold: 0 };
    const errors: Array<{ id: string; tier: string; error: string }> = [];
    let legalHoldSkipped = 0;

    const r2 =
      R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
        ? new AwsClient({
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
            service: 's3',
            region: 'auto',
          })
        : null;

    const s3 =
      AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION
        ? new AwsClient({
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            service: 's3',
            region: AWS_REGION,
          })
        : null;

    for (const row of rows) {
      if (row.legal_hold) {
        legalHoldSkipped++;
        continue;
      }
      if (dryRun) {
        counters[row.storage_tier]++;
        continue;
      }
      try {
        if (row.storage_key) {
          if (row.storage_tier === 'hot' && row.storage_bucket) {
            const { error: sErr } = await admin.storage
              .from(row.storage_bucket)
              .remove([row.storage_key]);
            if (sErr) throw new Error(`hot_storage: ${sErr.message}`);
          } else if (row.storage_tier === 'warm' && r2 && R2_ACCOUNT_ID && R2_WARM_BUCKET) {
            const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_WARM_BUCKET}/${row.storage_key}`;
            const res = await r2.fetch(url, { method: 'DELETE' });
            if (!res.ok && res.status !== 404) {
              throw new Error(`r2_delete [${res.status}]: ${await res.text()}`);
            }
          } else if (row.storage_tier === 'cold' && s3 && S3_COLD_BUCKET) {
            const url = `https://${S3_COLD_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${row.storage_key}`;
            const res = await s3.fetch(url, { method: 'DELETE' });
            if (!res.ok && res.status !== 404) {
              throw new Error(`s3_delete [${res.status}]: ${await res.text()}`);
            }
          }
        }
        const { error: delErr } = await admin.from('media_assets').delete().eq('id', row.id);
        if (delErr) throw new Error(`db_delete: ${delErr.message}`);
        counters[row.storage_tier]++;
      } catch (e) {
        errors.push({ id: row.id, tier: row.storage_tier, error: (e as Error).message });
      }
    }

    // Auditoria imutável
    const { error: auditErr } = await admin.from('media_forget_audit').insert({
      requested_by: caller.id,
      executed_by: caller.id,
      subject_user_id: payload.subject_user_id,
      reason: payload.reason,
      hot_deleted: counters.hot,
      warm_deleted: counters.warm,
      cold_deleted: counters.cold,
      legal_hold_skipped: legalHoldSkipped,
      errors,
      dry_run: dryRun,
    });
    if (auditErr) {
      return json(
        { error: 'audit_insert_failed', details: auditErr.message, counters, errors },
        500,
        cors
      );
    }

    return json(
      {
        ok: true,
        dry_run: dryRun,
        processed: rows.length,
        counters,
        legal_hold_skipped: legalHoldSkipped,
        errors,
        remaining_batch_hint: rows.length === batchSize ? 'call_again' : 'done',
      },
      200,
      cors
    );
  } catch (e) {
    return json({ error: 'internal_error', details: (e as Error).message }, 500, cors);
  }
});

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
