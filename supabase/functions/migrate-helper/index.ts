// Edge function utilitária de apoio à migração.
// IMPORTANTE: esta função NUNCA devolve SUPABASE_SERVICE_ROLE_KEY nem SUPABASE_DB_URL.
// Endpoint público (verify_jwt = false) só pode expor sinal não sensível.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-access-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** Comparação em tempo constante para não vazar o segredo por timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // O segredo vem do ambiente, nunca literal no código versionado.
  const expected = Deno.env.get("MIGRATE_HELPER_ACCESS_KEY");
  if (!expected) {
    return json({ error: "not_configured", detail: "MIGRATE_HELPER_ACCESS_KEY ausente" }, 503);
  }

  const provided = req.headers.get("x-access-key") ?? "";
  if (!safeEqual(provided, expected)) return json({ error: "unauthorized" }, 401);

  const action = new URL(req.url).searchParams.get("action") ?? "ping";

  if (action === "ping") {
    return json({ ok: true, ts: new Date().toISOString() });
  }

  // A antiga ação "credentials" foi removida de propósito: devolvia a service role key
  // em texto puro num endpoint sem JWT, o que anula a RLS de todo o projeto.
  if (action === "credentials") {
    return json({ error: "action_removed", detail: "credenciais nunca são expostas" }, 410);
  }

  return json({ error: "unknown_action" }, 400);
});
