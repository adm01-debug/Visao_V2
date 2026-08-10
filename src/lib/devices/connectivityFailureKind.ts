/**
 * Onda 153 — Regra única de tradução de CÓDIGO DE ERRO para CLASSE DE CULPA
 * do caminho de conectividade.
 *
 * A Onda 152 definiu que apenas falha de `transport` culpa a rota (D1). O que
 * faltava era o elo entre o que o banco guarda (`error_code`, texto livre) e
 * esse vocabulário fechado. Sem esse elo, cada consumidor inventava a própria
 * heurística — e uma senha errada acabava exilando a frota inteira.
 *
 * Regras de projeto:
 *
 *  T1 — **Função total.** Qualquer entrada, inclusive `null` e lixo, produz um
 *  valor do vocabulário. Desconhecido cai em `config` (neutro), NUNCA em
 *  `transport`: na dúvida, não acusamos a rota. Errar para o lado neutro custa
 *  uma tentativa a mais; errar para `transport` tira rota boa do ar.
 *
 *  T2 — **Só é `transport` o que é específico do caminho.** Um `timeout` ou um
 *  `reset` acontecem em UM caminho e não no outro; já `dns`, `tls` e credencial
 *  falham igual em todos, logo não distinguem rota e ficam neutros.
 *
 *  T3 — **Sucesso e cancelamento não são falha.** `none` significa "não há o
 *  que culpar" e preserva o contador de quarentena intacto.
 *
 *  T4 — **Espelho obrigatório.** A mesma tabela existe em SQL
 *  (`public.connectivity_failure_kind`). O gate `db:check:path-evidence`
 *  compara as duas listas token a token e falha se divergirem.
 */

import type { FailureKind } from '@/lib/devices/pathFailover';

/**
 * Códigos que provam falha DO CAMINHO. Lista fechada e explicitamente curta:
 * incluir um código aqui autoriza o sistema a rebaixar uma rota.
 */
export const TRANSPORT_ERROR_CODES: readonly string[] = [
  'timeout',
  'connect_timeout',
  'read_timeout',
  'reset',
  'refused',
  'connection_refused',
  'network_unreachable',
  'host_unreachable',
  'protocol',
  'relay_unavailable',
  'relay_timeout',
  'tunnel_down',
  'agent_offline',
];

/** Credencial/autorização: idêntica em qualquer rota, portanto neutra. */
export const AUTH_ERROR_CODES: readonly string[] = [
  'unauthorized',
  'forbidden',
  'invalid_credentials',
  'auth_failed',
  'credentials_missing',
  'kek_not_configured',
];

/** Cadastro/ambiente: também neutro, mas com ação humana distinta de `auth`. */
export const CONFIG_ERROR_CODES: readonly string[] = [
  'private_host_blocked',
  'dns',
  'dns_failure',
  'tls',
  'tls_handshake_failed',
  'redirect_loop',
  'invalid_url',
  'invalid_host',
  'no_onvif_endpoint',
  'missing_endpoint',
  'unsupported_scheme',
];

/** O equipamento respondeu, mas errado ou indisponível. Neutro para a rota. */
export const DEVICE_ERROR_CODES: readonly string[] = [
  'device_busy',
  'no_stream',
  'stream_unavailable',
  'camera_offline',
  'unsupported_profile',
  'ptz_not_supported',
];

/** Não é falha: sucesso, cancelamento do operador, ausência de código. */
export const NEUTRAL_ERROR_CODES: readonly string[] = ['aborted', 'cancelled', 'none', 'ok'];

const LOOKUP: ReadonlyMap<string, FailureKind> = new Map<string, FailureKind>([
  ...TRANSPORT_ERROR_CODES.map((c) => [c, 'transport'] as const),
  ...AUTH_ERROR_CODES.map((c) => [c, 'auth'] as const),
  ...CONFIG_ERROR_CODES.map((c) => [c, 'config'] as const),
  ...DEVICE_ERROR_CODES.map((c) => [c, 'device'] as const),
  ...NEUTRAL_ERROR_CODES.map((c) => [c, 'none'] as const),
]);

/**
 * Traduz um código de erro para a classe de culpa do caminho.
 *
 * @param code Código bruto vindo do banco. Aceita `null`/`undefined`/lixo.
 * @returns Sempre um valor do vocabulário; desconhecido vira `config` (T1).
 */
export function classifyPathFailure(code: string | null | undefined): FailureKind {
  if (typeof code !== 'string') return 'none';
  const normalized = code.trim().toLowerCase();
  if (normalized === '') return 'none';
  return LOOKUP.get(normalized) ?? 'config';
}

/**
 * Deriva a classe de culpa de uma linha de telemetria.
 *
 * Sucesso nunca é falha (T3). Em falha, o código da TENTATIVA
 * (`retry_error_code`) tem precedência sobre o código do problema ORIGINAL
 * (`error_code`) — o primeiro descreve o que aconteceu nesta rota, o segundo
 * apenas o motivo de o assistente ter sido aberto.
 */
export function classifyTelemetryRow(row: {
  succeeded: boolean | null;
  error_code: string | null;
  retry_error_code: string | null;
}): FailureKind {
  if (row.succeeded === true) return 'none';
  return classifyPathFailure(row.retry_error_code ?? row.error_code);
}
