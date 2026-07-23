// errorAudit.ts — Registro centralizado de erros de Edge Functions.
// Grava em `public.edge_function_error_audit` via service_role para permitir
// troubleshooting no painel administrativo. Nunca lança — falha silenciosamente
// para não mascarar o erro original que estamos reportando.
import { createClient } from "npm:@supabase/supabase-js@2";

export interface EdgeErrorAuditInput {
  function_name: string;
  error_code: string;
  http_status?: number | null;
  target_ip?: string | null;
  target_host?: string | null;
  run_from?: "cloud" | "relay" | "agent" | "client";
  relay_agent_id?: string | null;
  camera_id?: string | null;
  user_id?: string | null;
  request_id?: string | null;
  message?: string | null;
  hint?: string | null;
  context?: Record<string, unknown>;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

let cachedClient: ReturnType<typeof createClient> | null = null;
function admin() {
  if (!cachedClient && SUPABASE_URL && SERVICE_ROLE) {
    cachedClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

/** Extrai IPv4 do host quando possível (para indexar/filtrar por IP alvo). */
export function extractIp(host?: string | null): string | null {
  if (!host) return null;
  const m = host.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?$/);
  return m ? m[1] : null;
}

/** Não-bloqueante. Erros de auditoria são apenas registrados no console. */
export async function recordEdgeError(input: EdgeErrorAuditInput): Promise<void> {
  try {
    const client = admin();
    if (!client) return;
    const target_ip = input.target_ip ?? extractIp(input.target_host ?? null);
    await client.from("edge_function_error_audit").insert({
      function_name: input.function_name,
      error_code: input.error_code,
      http_status: input.http_status ?? null,
      target_ip,
      target_host: input.target_host ?? null,
      run_from: input.run_from ?? "cloud",
      relay_agent_id: input.relay_agent_id ?? null,
      camera_id: input.camera_id ?? null,
      user_id: input.user_id ?? null,
      request_id: input.request_id ?? null,
      message: input.message ?? null,
      hint: input.hint ?? null,
      context: input.context ?? {},
    });
  } catch (err) {
    console.error(JSON.stringify({
      level: "warn",
      fn: "errorAudit",
      msg: "audit_write_failed",
      err: err instanceof Error ? err.message : String(err),
    }));
  }
}
