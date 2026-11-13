// errorAudit.ts — Registro centralizado de erros de Edge Functions.
// Grava em `public.edge_function_error_audit` via service_role para permitir
// troubleshooting no painel administrativo. Nunca lança — falha silenciosamente
// para não mascarar o erro original que estamos reportando.
//
// Onda 146: além do código do erro, a auditoria passa a persistir a CLASSE da
// falha de rede (Onda 145) e o RESPONSÁVEL derivado por `failureBlame.ts`.
// Sem isso, "câmera muda" e "rede quebrada" viram a mesma linha na tabela e o
// alerta de manutenção despacha o técnico para o lugar errado.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { classifyNetworkError, type NetworkErrorKind } from './networkError.ts';
import { deriveBlame, type FailureBlame, type RunFrom } from './failureBlame.ts';

export interface EdgeErrorAuditInput {
  function_name: string;
  error_code: string;
  http_status?: number | null;
  target_ip?: string | null;
  target_host?: string | null;
  run_from?: RunFrom;
  relay_agent_id?: string | null;
  camera_id?: string | null;
  user_id?: string | null;
  request_id?: string | null;
  message?: string | null;
  hint?: string | null;
  context?: Record<string, unknown>;
  /**
   * Exceção original, quando houve falha de transporte. É classificada aqui —
   * o chamador não precisa (nem deve) reimplementar a taxonomia.
   */
  error?: unknown;
  /** Classe já conhecida. Tem precedência sobre a classificação de `error`. */
  network_kind?: NetworkErrorKind | null;
  /** `true` quando o nosso deadline estourou (distingue `timeout` de `aborted`). */
  deadline_expired?: boolean;
  /** Status HTTP recebido DO UPSTREAM — não o que devolvemos ao cliente. */
  upstream_status?: number | null;
  /** `true` quando a falha veio de dependência da nuvem (RPC, banco, storage). */
  cloud_dependency?: boolean;
  /** Sobrescreve o responsável derivado. Use apenas com justificativa no código. */
  blame?: FailureBlame | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

/**
 * Deriva classe de rede + responsável a partir da entrada de auditoria.
 * Exportada para teste: é a cola entre a taxonomia e a persistência, e é
 * exatamente onde um engano se torna invisível na tabela.
 */
export function classifyAuditInput(input: EdgeErrorAuditInput): {
  network_kind: NetworkErrorKind | null;
  blame: FailureBlame | null;
  blame_rule: string | null;
} {
  const network_kind =
    input.network_kind ??
    (input.error !== undefined
      ? classifyNetworkError(input.error, { deadlineExpired: input.deadline_expired === true })
      : null);

  // Sem sinal algum de rede/upstream/nuvem não há base honesta para acusar
  // ninguém: preferimos deixar NULL a poluir os painéis com "unknown".
  const hasSignal =
    network_kind !== null ||
    (input.upstream_status !== null && input.upstream_status !== undefined) ||
    input.cloud_dependency === true;
  if (!hasSignal && !input.blame) return { network_kind, blame: null, blame_rule: null };

  const verdict = deriveBlame({
    kind: network_kind,
    runFrom: input.run_from ?? 'cloud',
    upstreamStatus: input.upstream_status ?? null,
    cloudDependency: input.cloud_dependency === true,
  });

  return {
    network_kind,
    blame: input.blame ?? verdict.blame,
    blame_rule: verdict.rule,
  };
}

/** Não-bloqueante. Erros de auditoria são apenas registrados no console. */
export async function recordEdgeError(input: EdgeErrorAuditInput): Promise<void> {
  try {
    const client = admin();
    if (!client) return;
    const target_ip = input.target_ip ?? extractIp(input.target_host ?? null);
    const { network_kind, blame, blame_rule } = classifyAuditInput(input);
    // O cliente é criado sem os tipos gerados do banco, então o `insert()`
    // infere `never[]`. Montamos a linha explicitamente e passamos por um
    // alias amplo — a validação real de vocabulário está nos CHECKs da tabela.
    const row: Record<string, unknown> = {
      function_name: input.function_name,
      error_code: input.error_code,
      http_status: input.http_status ?? null,
      target_ip,
      target_host: input.target_host ?? null,
      run_from: input.run_from ?? 'cloud',
      relay_agent_id: input.relay_agent_id ?? null,
      camera_id: input.camera_id ?? null,
      user_id: input.user_id ?? null,
      request_id: input.request_id ?? null,
      message: input.message ?? null,
      hint: input.hint ?? null,
      context: input.context ?? {},
      network_kind,
      blame,
      blame_rule,
    };
    await (
      client.from('edge_function_error_audit') as unknown as {
        insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
      }
    ).insert(row);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'warn',
        fn: 'errorAudit',
        msg: 'audit_write_failed',
        err: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
