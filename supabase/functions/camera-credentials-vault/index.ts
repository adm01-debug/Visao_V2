// Camera Credentials Vault — Onda Fortress 2 + 5 + 6
// Ações: store | reveal | audit | migrate_batch | rotate_key | rotate_dek | rewrap_kek | backfill_envelope | stats
// Toda ação é auditada em public.camera_vault_audit (append-only) — Onda 6.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';

const VAULT_KEY = Deno.env.get('CAMERA_VAULT_KEY') ?? '';
const KEK_V1 = Deno.env.get('CAMERA_VAULT_KEK_V1') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('store'),
    camera_id: z.string().uuid(),
    stream_url: z.string().min(4).max(2048),
  }),
  z.object({ action: z.literal('reveal'), camera_id: z.string().uuid() }),
  z.object({ action: z.literal('audit') }),
  z.object({
    action: z.literal('migrate_batch'),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  z.object({ action: z.literal('rotate_key'), new_key: z.string().min(16).max(512) }),
  z.object({ action: z.literal('rotate_dek'), camera_id: z.string().uuid() }),
  z.object({
    action: z.literal('rewrap_kek'),
    new_kek: z.string().min(16).max(512),
    from_version: z.number().int().min(0).max(255).default(1),
    to_version: z.number().int().min(1).max(255),
    limit: z.number().int().min(1).max(1000).default(200),
  }),
  z.object({
    action: z.literal('backfill_envelope'),
    limit: z.number().int().min(1).max(500).default(100),
  }),
  z.object({ action: z.literal('stats') }),
]);

const j = (payload: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const log = (level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}) => {
  // never log keys/passwords
  console.log(
    JSON.stringify({
      level,
      fn: 'camera-credentials-vault',
      msg,
      ...meta,
      ts: new Date().toISOString(),
    })
  );
};

// Onda 6 — log imutável em public.camera_vault_audit
interface VaultAuditInput {
  admin: ReturnType<typeof createClient>;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  camera_id?: string | null;
  kek_version_from?: number | null;
  kek_version_to?: number | null;
  affected_rows?: number | null;
  success: boolean;
  error_code?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
}
async function logVaultAudit(input: VaultAuditInput): Promise<void> {
  try {
    await input.admin.from('camera_vault_audit').insert({
      actor_id: input.actor_id,
      actor_role: input.actor_role,
      action: input.action,
      camera_id: input.camera_id ?? null,
      kek_version_from: input.kek_version_from ?? null,
      kek_version_to: input.kek_version_to ?? null,
      affected_rows: input.affected_rows ?? null,
      success: input.success,
      error_code: input.error_code ?? null,
      ip: input.ip ?? null,
      user_agent: input.user_agent ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    log('error', 'vault_audit_insert_failed', {
      err: (err as Error).message,
      action: input.action,
    });
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const pre = handleCors(req);
  if (pre) return pre;

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const user_agent = req.headers.get('user-agent') ?? null;

  if (!VAULT_KEY || VAULT_KEY.length < 16) {
    log('error', 'CAMERA_VAULT_KEY missing or too short');
    return j({ error: 'vault_key_not_configured' }, 500, cors);
  }

  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, 'camera-vault', cors);
  if (!rl.allowed) return rl.response;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return j({ error: 'invalid_json' }, 400, cors);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success)
    return j({ error: 'validation_failed', details: parsed.error.flatten() }, 400, cors);
  const body = parsed.data;

  const authHeader = req.headers.get('Authorization') ?? '';
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let userId: string | null = null;
  let userRole: string | null = null;
  if (body.action !== 'reveal') {
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uerr } = await anon.auth.getUser();
    if (uerr || !u.user) {
      await logVaultAudit({
        admin,
        actor_id: null,
        actor_role: null,
        action: body.action,
        success: false,
        error_code: 'unauthorized',
        ip,
        user_agent,
      });
      return j({ error: 'unauthorized' }, 401, cors);
    }
    userId = u.user.id;
    const { data: r } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    userRole = (r?.role ?? null) as string | null;
  }

  const auditBase = { admin, actor_id: userId, actor_role: userRole, ip, user_agent };
  const denyAdmin = async (action: string): Promise<Response | null> => {
    if (userRole !== 'admin') {
      await logVaultAudit({
        ...auditBase,
        action,
        success: false,
        error_code: 'forbidden_admin_only',
      });
      return j({ error: 'forbidden_admin_only' }, 403, cors);
    }
    return null;
  };
  const denyKek = async (action: string): Promise<Response | null> => {
    if (!KEK_V1 || KEK_V1.length < 16) {
      await logVaultAudit({
        ...auditBase,
        action,
        success: false,
        error_code: 'kek_not_configured',
      });
      return j({ error: 'kek_not_configured' }, 500, cors);
    }
    return null;
  };

  try {
    switch (body.action) {
      case 'audit': {
        const { data, error } = await admin.rpc('audit_cameras_embedded_credentials');
        if (error) throw error;
        const rows = (data ?? []) as Array<{ user_id: string }>;
        const filtered = userRole === 'admin' ? rows : rows.filter((r) => r.user_id === userId);
        await logVaultAudit({
          ...auditBase,
          action: 'audit',
          success: true,
          affected_rows: filtered.length,
        });
        return j({ ok: true, cameras: filtered }, 200, cors);
      }

      case 'store': {
        const { data, error } = await admin.rpc('set_camera_credentials', {
          p_camera_id: body.camera_id,
          p_stream_url: body.stream_url,
          p_key: VAULT_KEY,
        });
        if (error) throw error;
        await logVaultAudit({
          ...auditBase,
          action: 'store',
          success: true,
          camera_id: body.camera_id,
        });
        return j({ ok: true, credential_id: data }, 200, cors);
      }

      case 'migrate_batch': {
        const denied = await denyAdmin('migrate_batch');
        if (denied) return denied;
        const { data: audit, error: aerr } = await admin.rpc('audit_cameras_embedded_credentials');
        if (aerr) throw aerr;
        const list = ((audit ?? []) as Array<{ camera_id: string; stream_url: string }>).slice(
          0,
          body.limit
        );
        let migrated = 0,
          failed = 0;
        for (const row of list) {
          const { error } = await admin.rpc('set_camera_credentials', {
            p_camera_id: row.camera_id,
            p_stream_url: row.stream_url,
            p_key: VAULT_KEY,
          });
          if (error) failed++;
          else migrated++;
        }
        await logVaultAudit({
          ...auditBase,
          action: 'migrate_batch',
          success: failed === 0,
          affected_rows: migrated,
          metadata: { failed, total: list.length },
        });
        return j({ ok: true, migrated, failed, total: list.length }, 200, cors);
      }

      case 'rotate_key': {
        const denied = await denyAdmin('rotate_key');
        if (denied) return denied;
        const { data, error } = await admin.rpc('rotate_camera_vault_key', {
          old_key: VAULT_KEY,
          new_key: body.new_key,
        });
        if (error) throw error;
        const rotated = (data as Array<{ rotated_count: number }>)[0]?.rotated_count ?? 0;
        await logVaultAudit({
          ...auditBase,
          action: 'rotate_key',
          success: true,
          affected_rows: rotated,
        });
        return j({ ok: true, result: data }, 200, cors);
      }

      case 'reveal': {
        if (authHeader !== `Bearer ${SERVICE_KEY}`) {
          await logVaultAudit({
            ...auditBase,
            actor_role: 'service_role_required',
            action: 'reveal',
            success: false,
            error_code: 'service_role_required',
            camera_id: body.camera_id,
          });
          return j({ error: 'service_role_required' }, 403, cors);
        }
        const { data, error } = await admin.rpc('get_camera_stream_url', {
          p_camera_id: body.camera_id,
          p_key: VAULT_KEY,
        });
        if (error) throw error;
        await logVaultAudit({
          ...auditBase,
          actor_role: 'service_role',
          action: 'reveal',
          success: true,
          camera_id: body.camera_id,
        });
        return j({ ok: true, stream_url: data }, 200, cors);
      }

      case 'stats': {
        const { data, error } = await admin.rpc('envelope_encryption_stats');
        if (error) throw error;
        await logVaultAudit({ ...auditBase, action: 'stats', success: true });
        return j({ ok: true, stats: (data as unknown[])[0] ?? data }, 200, cors);
      }

      case 'rotate_dek': {
        const d1 = await denyAdmin('rotate_dek');
        if (d1) return d1;
        const d2 = await denyKek('rotate_dek');
        if (d2) return d2;
        const { data, error } = await admin.rpc('rotate_camera_dek', {
          p_camera_id: body.camera_id,
          p_kek: KEK_V1,
          p_kek_version: 1,
        });
        if (error) throw error;
        await logVaultAudit({
          ...auditBase,
          action: 'rotate_dek',
          success: true,
          camera_id: body.camera_id,
          kek_version_to: 1,
          affected_rows: data ? 1 : 0,
        });
        return j({ ok: true, rotated: data }, 200, cors);
      }

      case 'rewrap_kek': {
        const d1 = await denyAdmin('rewrap_kek');
        if (d1) return d1;
        const d2 = await denyKek('rewrap_kek');
        if (d2) return d2;
        const { data, error } = await admin.rpc('rewrap_camera_vault_kek', {
          p_old_kek: KEK_V1,
          p_new_kek: body.new_kek,
          p_from_version: body.from_version,
          p_to_version: body.to_version,
          p_limit: body.limit,
        });
        if (error) throw error;
        const row = (data as Array<{ rewrapped_count: number; remaining: number }>)[0];
        await logVaultAudit({
          ...auditBase,
          action: 'rewrap_kek',
          success: true,
          kek_version_from: body.from_version,
          kek_version_to: body.to_version,
          affected_rows: row?.rewrapped_count ?? 0,
          metadata: { remaining: row?.remaining ?? null },
        });
        return j({ ok: true, result: data }, 200, cors);
      }

      case 'backfill_envelope': {
        const d1 = await denyAdmin('backfill_envelope');
        if (d1) return d1;
        const d2 = await denyKek('backfill_envelope');
        if (d2) return d2;
        const { data, error } = await admin.rpc('backfill_envelope_encryption', {
          p_kek: KEK_V1,
          p_kek_version: 1,
          p_limit: body.limit,
        });
        if (error) throw error;
        const row = (data as Array<{ migrated: number; remaining: number; failed: number }>)[0];
        await logVaultAudit({
          ...auditBase,
          action: 'backfill_envelope',
          success: (row?.failed ?? 0) === 0,
          kek_version_to: 1,
          affected_rows: row?.migrated ?? 0,
          metadata: { remaining: row?.remaining ?? null, failed: row?.failed ?? null },
        });
        return j({ ok: true, result: data }, 200, cors);
      }
    }
  } catch (err) {
    const errMsg = (err as Error).message ?? 'unknown';
    await logVaultAudit({
      ...auditBase,
      action: body.action,
      success: false,
      error_code: errMsg.slice(0, 200),
    });
    log('error', 'handler_error', { err: errMsg, action: body.action });
    return j({ error: 'internal_error', detail: errMsg }, 500, cors);
  }
});
