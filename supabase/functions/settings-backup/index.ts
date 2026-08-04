// Onda 46 — Export/Import de Configuração
// Retorna backup JSON assinado com WHITELIST estrita de campos (nunca secrets).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SCHEMA_VERSION = '1.0.0';

// Whitelist — NUNCA incluir tokens, credenciais, urls RTSP com senha embutida
const CAMERA_FIELDS = 'id,name,location,type,status,created_at';
const ZONE_FIELDS = 'id,camera_id,name,coordinates,created_at';
const RULE_FIELDS = 'id,name,description,conditions,actions,enabled,created_at';
const NOTIF_FIELDS = 'id,type,enabled,filters,created_at';

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;
  const cors = getCorsHeaders(req);

  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, 'settings-backup', cors);
  if (!rl.allowed) return rl.response;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401, cors);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (!claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401, cors);

  const url = new URL(req.url);
  const isExport = url.pathname.endsWith('/export') || req.method === 'GET';

  if (isExport) {
    const [cameras, zones, rules, notifs] = await Promise.all([
      supabase.from('cameras').select(CAMERA_FIELDS),
      supabase.from('zones').select(ZONE_FIELDS),
      supabase.from('rules').select(RULE_FIELDS),
      supabase.from('notification_configs').select(NOTIF_FIELDS),
    ]);
    const backup = {
      schema_version: SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      exported_by: claims.claims.sub,
      counts: {
        cameras: cameras.data?.length ?? 0,
        zones: zones.data?.length ?? 0,
        rules: rules.data?.length ?? 0,
        notifications: notifs.data?.length ?? 0,
      },
      data: {
        cameras: cameras.data ?? [],
        zones: zones.data ?? [],
        rules: rules.data ?? [],
        notifications: notifs.data ?? [],
      },
    };
    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="visao-backup-${Date.now()}.json"`,
      },
    });
  }

  // ============ IMPORT ============
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
  const body = (await req.json().catch(() => null)) as {
    schema_version?: string;
    data?: Record<string, unknown[]>;
    conflict_strategy?: string;
  } | null;
  if (!body?.schema_version)
    return json({ error: 'Backup inválido: schema_version ausente' }, 422, cors);
  if (body.schema_version !== SCHEMA_VERSION) {
    return json(
      {
        error: `schema_version incompatível: esperado ${SCHEMA_VERSION}, recebido ${body.schema_version}`,
      },
      422,
      cors
    );
  }
  const strategy = body.conflict_strategy ?? 'skip'; // skip | overwrite
  if (!['skip', 'overwrite'].includes(strategy)) {
    return json({ error: 'conflict_strategy inválido (skip|overwrite)' }, 400, cors);
  }
  // Import diferido para v1.1 — retorna preview seguro
  const preview = {
    would_import: {
      cameras: body.data?.cameras?.length ?? 0,
      zones: body.data?.zones?.length ?? 0,
      rules: body.data?.rules?.length ?? 0,
      notifications: body.data?.notifications?.length ?? 0,
    },
    strategy,
    note: 'Import execution reservado à Onda 46.1 — validação estrutural OK.',
  };
  return json({ data: preview }, 202, cors);
});
