/**
 * VISÃO - Modo Teste (dry-run) — helper server-side para Edge Functions.
 *
 * Consulta `public.is_test_mode_active(_user_id, _camera_id, _rule_id)` via
 * cliente com service-role para permitir short-circuit em qualquer função,
 * mesmo quando o JWT do usuário não estiver disponível no request.
 *
 * Fail-safe: em caso de erro na consulta, retorna `false` para NUNCA silenciar
 * um alerta real por falha de infraestrutura.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createLogger } from "./logger.ts";

export interface TestModeContext {
  userId?: string | null;
  cameraId?: string | null;
  ruleId?: string | null;
}

const log = createLogger("test-mode-check");

let cachedClient: ReturnType<typeof createClient> | null = null;
function getServiceClient() {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

export async function isTestModeActive(ctx: TestModeContext): Promise<boolean> {
  if (!ctx?.userId) return false;
  const client = getServiceClient();
  if (!client) return false;
  try {
    const { data, error } = await client.rpc("is_test_mode_active", {
      _user_id: ctx.userId,
      _camera_id: ctx.cameraId ?? null,
      _rule_id: ctx.ruleId ?? null,
    });
    if (error) {
      log.warn("is_test_mode_active RPC failed; assuming inactive", { error: error.message });
      return false;
    }
    return Boolean(data);
  } catch (err) {
    log.warn("is_test_mode_active threw; assuming inactive", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export interface TestModeShortCircuitResult {
  testMode: true;
  suppressed: true;
  channels?: string[];
  reason: "test_mode_active";
  scope: TestModeContext;
  timestamp: string;
}

export function buildTestModeResponse(
  ctx: TestModeContext,
  channels?: string[],
): TestModeShortCircuitResult {
  return {
    testMode: true,
    suppressed: true,
    channels,
    reason: "test_mode_active",
    scope: {
      userId: ctx.userId ?? null,
      cameraId: ctx.cameraId ?? null,
      ruleId: ctx.ruleId ?? null,
    },
    timestamp: new Date().toISOString(),
  };
}

export interface RecordTestModeSuppressionInput {
  ctx: TestModeContext;
  sourceFunction: string;
  alertId?: string | null;
  channels?: string[];
  reason?: string;
  traceId?: string | null;
  payloadSummary?: Record<string, unknown>;
}

/**
 * Persiste um registro de auditoria para uma execução suprimida em modo teste.
 * Fail-safe: qualquer erro é apenas logado — nunca propaga, para não afetar
 * o fluxo de short-circuit que já retornou resposta ao chamador.
 */
export async function recordTestModeSuppression(
  input: RecordTestModeSuppressionInput,
): Promise<void> {
  const client = getServiceClient();
  if (!client || !input.ctx?.userId) return;
  try {
    const row = {
      user_id: input.ctx.userId,
      source_function: input.sourceFunction,
      alert_id: input.alertId ?? null,
      rule_id: input.ctx.ruleId ?? null,
      camera_id: input.ctx.cameraId ?? null,
      channels: input.channels ?? null,
      reason: input.reason ?? "test_mode_active",
      trace_id: input.traceId ?? null,
      payload_summary: input.payloadSummary ?? {},
    };
    const { error } = await client.from("test_mode_suppressions").insert(row);
    if (error) {
      log.warn("failed to persist test_mode_suppressions row", { error: error.message });
    }
  } catch (err) {
    log.warn("recordTestModeSuppression threw", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
