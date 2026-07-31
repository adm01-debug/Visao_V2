// Edge function temporária para migração/leitura de banco.
// Protegida por segredo `MIGRATE_HELPER_ACCESS_KEY` (header `x-access-key`).
// Remova esta função ao final da migração.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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

const MAX_SQL_LENGTH = 100_000;

/** Remove comentários e literais para inspecionar a estrutura da query com segurança. */
function stripNoise(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""')
    .replace(/\$\$[\s\S]*?\$\$/g, " ");
}

type Guard = { ok: true; sql: string } | { ok: false; status: number; error: string };

function guardReadOnly(rawSql: unknown): Guard {
  if (typeof rawSql !== "string" || rawSql.trim().length === 0) {
    return { ok: false, status: 400, error: "missing_sql" };
  }
  if (rawSql.length > MAX_SQL_LENGTH) {
    return { ok: false, status: 413, error: "sql_too_large" };
  }

  const sql = rawSql.trim();
  const probe = stripNoise(sql).trim();
  const upper = probe.toUpperCase();

  // Somente leitura: precisa começar com SELECT ou WITH.
  if (!/^(SELECT|WITH)\b/.test(upper)) {
    return { ok: false, status: 403, error: "read_only_violation" };
  }

  // Um único statement: `;` só é tolerado como terminador final.
  const withoutTrailing = probe.replace(/;\s*$/, "");
  if (withoutTrailing.includes(";")) {
    return { ok: false, status: 403, error: "read_only_violation" };
  }

  // WITH ... AS ( INSERT/UPDATE/DELETE ... ) é escrita disfarçada de leitura.
  if (/\b(INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|MERGE\s+INTO)\b/.test(upper)) {
    return { ok: false, status: 403, error: "read_only_violation" };
  }
  if (
    /\b(DROP|ALTER|CREATE|GRANT|REVOKE|TRUNCATE|COPY|VACUUM|REINDEX|CLUSTER|COMMENT\s+ON|SECURITY\s+LABEL|CALL|DO|SET|RESET|LISTEN|NOTIFY|PREPARE|EXECUTE|REFRESH\s+MATERIALIZED|LOCK|BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b/
      .test(upper)
  ) {
    return { ok: false, status: 403, error: "read_only_violation" };
  }

  return { ok: true, sql };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const accessKey = Deno.env.get("MIGRATE_HELPER_ACCESS_KEY");
  if (!accessKey) return json({ error: "not_configured" }, 503);

  if (req.headers.get("x-access-key") !== accessKey) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }
  const action = (body.action as string) ?? url.searchParams.get("action") ?? "ping";

  try {
    if (action === "ping") {
      return json({ ok: true, project_ref: Deno.env.get("SUPABASE_URL") });
    }

    if (action === "read_sql") {
      if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

      const guard = guardReadOnly(body.sql);
      if (!guard.ok) return json({ error: guard.error }, guard.status);

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false, autoRefreshToken: false } },
      );

      const { data, error } = await supabaseAdmin.rpc("exec_sql", { query: guard.sql });
      if (error) {
        return json({ ok: false, error: error.message, ts: new Date().toISOString() }, 500);
      }
      return json({ ok: true, rows: data, ts: new Date().toISOString() });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e), ts: new Date().toISOString() }, 500);
  }
});
