// Onda 46 — Export/Import de Configuração
// Retorna backup JSON assinado com WHITELIST estrita de campos (nunca secrets).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SCHEMA_VERSION = '1.0.0';

// Whitelist — NUNCA incluir tokens, credenciais, urls RTSP com senha embutida.
// Os nomes precisam existir no schema real, senão o PostgREST devolve 42703 e o
// backup sairia vazio: `cameras` não tem `type`, `zones` guarda `points` (não
// `coordinates`), `rules` usa `is_active` (não `enabled`) e `notification_configs`
// guarda `channels`/`severity_filter` (não `type`/`filters`).
const CAMERA_FIELDS = 'id,name,location,status,created_at';
const ZONE_FIELDS = 'id,camera_id,name,type,color,points,is_active,created_at';
const RULE_FIELDS =
  'id,name,description,category,severity,conditions,actions,cameras,schedule,is_active,created_at';
const NOTIF_FIELDS =
  'id,name,enabled,channels,severity_filter,cooldown_minutes,schedule_enabled,schedule_start_time,schedule_end_time,schedule_days,created_at';

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
    // Um select com coluna inexistente devolve `data: null`; sem esta checagem o
    // arquivo era baixado vazio com HTTP 200 e o usuário achava que tinha backup.
    const failures = (
      [
        ['cameras', cameras.error],
        ['zones', zones.error],
        ['rules', rules.error],
        ['notifications', notifs.error],
      ] as Array<[string, { message: string } | null]>
    )
      .filter(([, error]) => error !== null)
      .map(([table, error]) => ({ table, message: error?.message ?? '' }));
    if (failures.length > 0) {
      return json(
        { error: 'Não foi possível ler a configuração para exportar', details: failures },
        500,
        cors
      );
    }
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
    dry_run?: boolean;
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
  if (
    body.data !== undefined &&
    (typeof body.data !== 'object' || body.data === null || Array.isArray(body.data))
  ) {
    return json({ error: 'Backup inválido: data deve ser um objeto' }, 422, cors);
  }
  // A RPC recebe as coleções como arrays de objetos; validar aqui (contrato do
  // guia de Edge Functions) evita que um arquivo com “cameras” em texto chegue ao banco.
  for (const key of ['cameras', 'zones', 'rules', 'notifications'] as const) {
    const value = body.data?.[key];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'object' || item === null)) {
      return json(
        { error: `Backup inválido: data.${key} deve ser uma lista de objetos` },
        422,
        cors
      );
    }
  }
  const strategy = body.conflict_strategy ?? 'skip'; // skip | overwrite
  if (!['skip', 'overwrite'].includes(strategy)) {
    return json({ error: 'conflict_strategy inválido (skip|overwrite)' }, 400, cors);
  }
  const preview = {
    would_import: {
      cameras: body.data?.cameras?.length ?? 0,
      zones: body.data?.zones?.length ?? 0,
      rules: body.data?.rules?.length ?? 0,
      notifications: body.data?.notifications?.length ?? 0,
    },
    strategy,
  };

  // `dry_run` devolve só a prévia; a escrita de verdade é feita pela RPC
  // `import_settings_backup`, que valida schema, limita o volume e roda com o
  // JWT do chamador (a RLS decide o que ele pode criar). Assim o import não
  // ganha um segundo interpretador de backup que possa divergir do banco.
  if (body.dry_run === true) return json({ data: preview }, 200, cors);

  const { data: imported, error: rpcError } = await supabase.rpc('import_settings_backup', {
    _payload: {
      schema_version: body.schema_version,
      data: {
        cameras: body.data?.cameras ?? [],
        zones: body.data?.zones ?? [],
        rules: body.data?.rules ?? [],
        notifications: body.data?.notifications ?? [],
      },
    },
    _strategy: strategy,
  });
  if (rpcError) {
    return json(
      {
        error: rpcError.message,
        hint: 'O backup precisa ter sido gerado por esta mesma versão (schema 1.0.0).',
        preview,
      },
      422,
      cors
    );
  }
  return json({ data: imported, preview }, 200, cors);
});
