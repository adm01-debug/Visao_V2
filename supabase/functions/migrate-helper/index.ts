// Edge function temporária para migração.
// Protegida por segredo `MIGRATE_HELPER_ACCESS_KEY` (header `x-access-key`).
// Remova esta função ao final da migração.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-access-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const accessKey = Deno.env.get('MIGRATE_HELPER_ACCESS_KEY');
  if (!accessKey) return json({ error: 'not_configured' }, 503);

  if (req.headers.get('x-access-key') !== accessKey) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === 'POST') {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }
  const action = (body.action as string) ?? url.searchParams.get('action') ?? 'ping';

  if (action === 'ping') {
    return json({ ok: true, project_ref: Deno.env.get('SUPABASE_URL') });
  }

  return json({ error: 'unknown_action' }, 400);
});
