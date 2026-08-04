// _shared/relayWindow.ts
// Onda 120 — política temporal da fila de relay para o lado Deno.
//
// Espelha `src/lib/relayVerdict.ts` e `src/lib/relayTaskWindow.ts`. Existe para
// que nenhum produtor de tarefa precise inventar seu próprio TTL: um TTL menor
// que a janela justa (60s) produz uma linha que o diagnóstico da Onda 115 é
// obrigado a descartar — e uma fila cheia de linhas descartáveis deixa a frota
// sem sensor de surdez.
//
// Regra: `expires_at` cobre, ao mesmo tempo, (a) o tempo que a Edge Function
// realmente vai esperar e (b) o mínimo que torna a linha diagnosticável.

/** Janela mínima para que a ausência de resposta acuse o agente. Espelha o SQL. */
export const RELAY_FAIR_WINDOW_SEC = 60;

/** Teto de sanidade — evita tarefa zumbi ocupando a fila. Espelha o SQL. */
export const RELAY_MAX_WINDOW_SEC = 3600;

/**
 * Erro gravado quando é a Edge Function que desiste de esperar. Precisa ser
 * distinto de qualquer silêncio do agente: `heal_local_agents` exclui este
 * motivo do cálculo de surdez, porque a desistência foi nossa.
 */
export const RELAY_BACKEND_ABANDONED = 'relay_backend_abandoned';

/**
 * TTL conforme, em segundos, para um produtor que espera `backendTimeoutMs`.
 * Nunca abaixo da janela justa, nunca acima do teto.
 */
export function conformantTtlSeconds(backendTimeoutMs: number): number {
  const cobreEspera = Math.ceil(Math.max(0, backendTimeoutMs) / 1000);
  return Math.min(RELAY_MAX_WINDOW_SEC, Math.max(RELAY_FAIR_WINDOW_SEC, cobreEspera));
}

/**
 * `expires_at` em ISO para uma tarefa criada agora. Passar o mesmo
 * `backendTimeoutMs` usado no laço de polling mantém as duas pontas coerentes.
 */
export function relayExpiresAt(backendTimeoutMs: number, from: Date = new Date()): string {
  return new Date(from.getTime() + conformantTtlSeconds(backendTimeoutMs) * 1000).toISOString();
}
