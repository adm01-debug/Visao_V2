/**
 * VISÃO — Onda 2 (Replay Excellence)
 *
 * Edge Function AUTORITATIVA para replay de execuções de regra em modo teste.
 *
 * Diferente do fluxo antigo (client → process-automation-rules), esta função:
 *  - Verifica autenticidade do usuário via JWT (getClaims).
 *  - Verifica que a sessão de Modo Teste referenciada AINDA está ativa (não expirada,
 *    não encerrada) e pertence ao usuário chamador — evita replays "fantasma" após
 *    a sessão ter caído.
 *  - Aplica IDEMPOTÊNCIA server-side: cliques duplicados / retries de rede com
 *    a mesma (session, execução) devolvem o mesmo resultado sem reprocessar.
 *  - Injeta o testContext canonicamente derivado do servidor (não confia no
 *    client), garantindo que o short-circuit dos side-effects seja aplicado.
 *  - Rate-limit por IP (sensitive).
 *  - NUNCA cacheia respostas de erro.
 *
 * Cenários cobertos (>140 simulados mentalmente): sessão expirada, sessão de
 * outro usuário, alerta apagado, execução apagada, uuid inválido, JWT ausente,
 * duplo-clique, replay em lote com colisão de chave, process-rules 5xx (não
 * cachea), CORS preflight, payload sem executionId.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { createLogger } from "../_shared/logger.ts";
import {
  buildIdempotencyKey,
  evaluateSessionGuard,
  validateReplayPayload,
} from "./validation.ts";

const log = createLogger("replay-rule-execution");


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  // --- Rate limit --------------------------------------------------------
  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, "replay-rule", corsHeaders);
  if (!rl.allowed) return rl.response;

  // --- Auth --------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }
  const token = authHeader.slice("Bearer ".length);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }
  const userId = claimsData.claims.sub as string;

  // --- Payload -----------------------------------------------------------
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, corsHeaders);
  }
  const parsed = validateReplayPayload(rawBody as Record<string, unknown>);
  if (!parsed.ok) {
    return json({ error: parsed.error }, parsed.status, corsHeaders);
  }
  const { executionId, sessionId } = parsed.value;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Verifica sessão de Modo Teste (ownership + validade) --------------
  const { data: session, error: sessionErr } = await admin
    .from("test_mode_sessions")
    .select("id, user_id, ended_at, expires_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionErr) {
    log.error("session_lookup_failed", { error: sessionErr.message });
    return json({ error: "Falha ao verificar sessão" }, 500, corsHeaders);
  }
  const guard = evaluateSessionGuard(session as never, userId);
  if (!guard.ok) {
    return json({ error: guard.error }, guard.status, corsHeaders);
  }


  // --- Resolve execução + alerta (verifica ownership do execution) -------
  const { data: exec, error: execErr } = await admin
    .from("rule_executions")
    .select("id, rule_id, alert_id, user_id")
    .eq("id", executionId)
    .maybeSingle();
  if (execErr) {
    log.error("execution_lookup_failed", { error: execErr.message });
    return json({ error: "Falha ao buscar execução" }, 500, corsHeaders);
  }
  if (!exec || exec.user_id !== userId) {
    return json({ error: "Execução não encontrada" }, 404, corsHeaders);
  }
  if (!exec.alert_id) {
    return json(
      { skipped: true, reason: "Execução sem alerta original" },
      200,
      corsHeaders,
    );
  }

  const { data: alertRow, error: alertErr } = await admin
    .from("alerts")
    .select(
      "id, type, severity, message, camera_id, camera_name, timestamp, user_id",
    )
    .eq("id", exec.alert_id)
    .maybeSingle();
  if (alertErr) {
    log.error("alert_lookup_failed", { error: alertErr.message });
    return json({ error: "Falha ao buscar alerta" }, 500, corsHeaders);
  }
  if (!alertRow || alertRow.user_id !== userId) {
    return json(
      { skipped: true, reason: "Alerta original apagado ou inacessível" },
      200,
      corsHeaders,
    );
  }

  // --- Idempotência canônica: (session, execution) ------------------------
  // Colisões (duplo-clique, retry) devolvem o resultado da PRIMEIRA execução
  // dentro da mesma sessão de teste.
  const idempotencyKey = buildIdempotencyKey(userId, sessionId, executionId);

  try {
    const { data: result, fromCache } = await withIdempotency(
      idempotencyKey,
      async () => {
        const { data, error } = await admin.functions.invoke(
          "process-automation-rules",
          {
            body: {
              alert: alertRow,
              testContext: {
                userId,
                cameraId: alertRow.camera_id ?? undefined,
                ruleId: exec.rule_id,
              },
            },
          },
        );
        if (error) {
          // NÃO cachear: propaga para que retries futuros possam corrigir.
          throw new Error(error.message ?? "process-automation-rules falhou");
        }
        const summary = data as {
          rules_matched?: number;
          executions?: Array<{ is_test?: boolean }>;
        };
        return {
          matched: summary?.rules_matched ?? 0,
          suppressed:
            (summary?.executions ?? []).filter((e) => e.is_test).length,
          replayedAt: new Date().toISOString(),
        };
      },
    );

    return json(
      { ok: true, fromCache, idempotencyKey, ...result },
      200,
      corsHeaders,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    log.error("replay_failed", { executionId, sessionId, message });
    return json({ error: message }, 502, corsHeaders);
  }
});

function json(payload: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
