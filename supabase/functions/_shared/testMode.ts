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
