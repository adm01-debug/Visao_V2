// _shared/relayTransport.ts
// Transporte HTTP plugável (direto ou via Agente Local) compartilhado pelas
// Edge Functions que precisam alcançar câmeras em LAN privada.
//
// Segurança:
//   - `resolveRelayTransport` autentica o JWT, valida posse do agente (RLS por user_id)
//     e confere heartbeat < 2 min antes de aceitar o relé.
//   - Nunca aceita `relay_agent_id` sem autenticação.
//   - Corpos binários são transportados em base64; texto UTF-8 preservado.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { RELAY_BACKEND_ABANDONED, conformantTtlSeconds, relayExpiresAt } from "./relayWindow.ts";

export const RELAY_TASK_TIMEOUT_MS = 25_000;
export const RELAY_POLL_INTERVAL_MS = 400;
/**
 * Onda 120: o TTL deixa de ser um número solto. Ele é derivado do tempo que
 * esta função realmente espera e nunca cai abaixo da janela justa de 60s —
 * abaixo disso a tarefa vira uma linha que o diagnóstico de surdez precisa
 * descartar, cegando a rotina de cura.
 */
export const RELAY_TASK_TTL_SEC = conformantTtlSeconds(RELAY_TASK_TIMEOUT_MS);
const AGENT_STALE_MS = 120_000;

export interface HttpResult {
  ok: boolean;
  status: number;
  text: string;
  headers?: Record<string, string>;
}

export interface Transport {
  request(input: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
    headers?: Record<string, string>;
    body?: string; // texto UTF-8; para binário use body_b64 em relay direto
    timeoutMs: number;
  }): Promise<HttpResult>;
}

export class DirectTransport implements Transport {
  async request({ url, method = "GET", headers, body, timeoutMs }: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
    headers?: Record<string, string>;
    body?: string;
    timeoutMs: number;
  }): Promise<HttpResult> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, headers, body, signal: controller.signal, redirect: "manual" });
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });
      return { ok: res.ok, status: res.status, text: await res.text(), headers: responseHeaders };
    } catch (e) {
      return { ok: false, status: 0, text: (e as Error).message };
    } finally {
      clearTimeout(t);
    }
  }
}

export class RelayTransport implements Transport {
  constructor(
    private admin: SupabaseClient,
    private agentId: string,
    private userId: string,
  ) {}

  async request({ url, method = "GET", headers, body, timeoutMs }: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
    headers?: Record<string, string>;
    body?: string;
    timeoutMs: number;
  }): Promise<HttpResult> {
    const bodyB64 = body ? btoa(unescape(encodeURIComponent(body))) : null;
    const expiresAt = relayExpiresAt(RELAY_TASK_TIMEOUT_MS);
    const { data: inserted, error: insErr } = await this.admin
      .from("agent_relay_tasks")
      .insert({
        agent_id: this.agentId,
        user_id: this.userId,
        kind: "http_request",
        request: { url, method, headers: headers ?? {}, body_b64: bodyB64, timeout_ms: timeoutMs },
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return { ok: false, status: 0, text: `relay_enqueue_failed:${insErr?.message ?? "unknown"}` };
    }
    const taskId = (inserted as { id: string }).id;

    const deadline = Date.now() + RELAY_TASK_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, RELAY_POLL_INTERVAL_MS));
      const { data: task } = await this.admin
        .from("agent_relay_tasks")
        .select("status, response, error")
        .eq("id", taskId)
        .maybeSingle();
      if (!task) continue;
      if (task.status === "done" && task.response) {
        const r = task.response as { status: number; body_b64?: string; headers?: Record<string, string> };
        const text = r.body_b64 ? decodeURIComponent(escape(atob(r.body_b64))) : "";
        return {
          ok: r.status >= 200 && r.status < 300,
          status: r.status,
          text,
          headers: r.headers,
        };
      }
      if (task.status === "failed" || task.status === "expired") {
        return { ok: false, status: 0, text: `relay_${task.status}:${task.error ?? ""}` };
      }
    }
    await this.admin
      .from("agent_relay_tasks")
      // Onda 120: quem desistiu fomos nós, não o agente. O motivo precisa ser
      // distinguível para que `heal_local_agents` não conte isto como surdez.
      .update({ status: "expired", error: RELAY_BACKEND_ABANDONED, completed_at: new Date().toISOString() })
      .eq("id", taskId)
      .in("status", ["pending", "in_progress"]);
    return { ok: false, status: 0, text: "relay_backend_timeout" };
  }
}

export interface RelayResolution {
  transport: Transport;
  usingRelay: boolean;
  userId?: string;
  agentId?: string;
  error?: { code: string; status: number; message?: string };
}

/**
 * Resolve o transporte a partir do request. Se `relayAgentId` for informado,
 * autentica o JWT, valida a posse do agente e o heartbeat.
 * Caso contrário, retorna DirectTransport.
 */
export async function resolveRelayTransport(
  req: Request,
  relayAgentId: string | null | undefined,
): Promise<RelayResolution> {
  if (!relayAgentId) {
    return { transport: new DirectTransport(), usingRelay: false };
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return { transport: new DirectTransport(), usingRelay: false, error: { code: "unauthenticated", status: 401 } };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await anon.auth.getUser();
  if (userErr || !userData?.user) {
    return { transport: new DirectTransport(), usingRelay: false, error: { code: "unauthenticated", status: 401 } };
  }
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: agent, error: agentErr } = await admin
    .from("local_agents")
    .select("id, user_id, last_seen_at")
    .eq("id", relayAgentId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (agentErr || !agent) {
    return { transport: new DirectTransport(), usingRelay: false, error: { code: "relay_agent_not_found", status: 404 } };
  }
  const lastSeen = agent.last_seen_at ? new Date(agent.last_seen_at).getTime() : 0;
  if (Date.now() - lastSeen > AGENT_STALE_MS) {
    return {
      transport: new DirectTransport(),
      usingRelay: false,
      error: { code: "relay_agent_offline", status: 409, message: "O agente selecionado não faz heartbeat há mais de 2 minutos." },
    };
  }
  return {
    transport: new RelayTransport(admin, agent.id as string, userData.user.id),
    usingRelay: true,
    userId: userData.user.id,
    agentId: agent.id as string,
  };
}
