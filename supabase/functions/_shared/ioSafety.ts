/**
 * Onda 154 — REGRA ÚNICA DE SEGURANÇA DO I/O DE ALARME FÍSICO.
 *
 * ## O que está em jogo
 *
 * Toda regra anterior deste sistema move bits. Esta move **matéria**: fecha um
 * relé que abre um portão, dispara uma sirene, libera uma catraca. O custo de
 * um erro deixa de ser um dado errado na tela e passa a ser um portão aberto às
 * 3h da manhã, ou uma sirene travada ligada até alguém ir até lá com escada.
 *
 * Por isso este módulo é deliberadamente **restritivo e puro**: sem React, sem
 * rede, sem relógio próprio (o instante é injetado). Todo veredito é
 * reproduzível no CI e espelhável no banco.
 *
 * ## Decisões e o porquê
 *
 *  S1 — **Desligar nunca é bloqueado por conveniência.** `set_inactive` (soltar
 *  a saída) ignora o intervalo mínimo entre acionamentos e ignora o estado
 *  redundante. Um limitador de taxa que impede desligar uma sirene é um defeito
 *  de segurança, não uma proteção. A capacidade continua exigida — desligar é
 *  ato de operação, não de qualquer um.
 *
 *  S2 — **Duração tem teto duro.** Pulso entre 100ms e 60s. Abaixo de 100ms o
 *  relé mecânico simplesmente não comuta e o operador acha que o sistema
 *  ignorou o comando; acima de 60s não é pulso, é travamento — e travamento
 *  exige comando explícito de manter (`set_active`), que deixa rastro distinto
 *  na trilha.
 *
 *  S3 — **`monostable` não sabe manter.** Equipamento monostable volta sozinho
 *  ao repouso; aceitar `set_active` nele produziria uma UI mentindo que a saída
 *  está travada quando ela já voltou. Recusamos em vez de fingir.
 *
 *  S4 — **Intervalo mínimo protege o relé, não o software.** Contato mecânico
 *  tem vida útil finita (tipicamente 10^5 ciclos). Martelar um relé em laço de
 *  regra queima o equipamento do cliente em dias. `too_soon` é recusa honesta.
 *
 *  S5 — **Trava de tempo máximo em nível ativo.** Uma saída mantida ativa além
 *  de `MAX_HOLD_MS` é anomalia, não intenção: quem trava uma sirene por mais de
 *  uma hora esqueceu dela. A função `shouldAutoRelease` expõe isso para o
 *  vigilante, que solta a saída e registra o motivo.
 *
 *  S6 — **Entrada nunca é acionada.** `direction === 'input'` é contato seco de
 *  leitura. Comandar uma entrada é sempre erro de programação, jamais uma
 *  operação silenciosamente ignorada.
 *
 *  S7 — **Função total.** Qualquer combinação de entradas produz um veredito do
 *  vocabulário fechado. Não existe `throw` neste módulo.
 *
 * Invariantes varridas pela simulação da etapa 8:
 *   I1 nenhum veredito permitido excede MAX_PULSE_MS
 *   I2 `set_inactive` em saída habilitada com capacidade é sempre permitido
 *   I3 comando em porta de entrada é sempre recusado
 *   I4 comando sem capacidade é sempre recusado, antes de qualquer outra checagem
 *   I5 o veredito não depende de ordem nem de estado global (pureza)
 */

/** Direção física da porta. */
export type IoDirection = 'input' | 'output';

/** Modo de operação da saída no equipamento. */
export type IoOutputMode = 'monostable' | 'bistable';

/** Estado conhecido da porta. `unknown` é honesto e comum após reboot. */
export type IoPortState = 'active' | 'inactive' | 'unknown';

/** Comandos aceitos. Lista fechada — espelhada no CHECK de `io_actuation_log`. */
export type IoCommandKind = 'pulse' | 'set_active' | 'set_inactive';

/**
 * Motivos canônicos de recusa. Os mesmos códigos aparecem em
 * `io_actuation_log.reason_code` e nas mensagens da Edge Function.
 */
export type IoRefusalReason =
  | 'unknown_port'
  | 'missing_capability'
  | 'port_disabled'
  | 'not_an_output'
  | 'duration_too_short'
  | 'duration_too_long'
  | 'hold_not_supported'
  | 'too_soon'
  | 'already_in_state';

/** Limites duros. Alterar qualquer um destes é decisão de segurança, não ajuste. */
export const MIN_PULSE_MS = 100;
export const MAX_PULSE_MS = 60_000;
/** Tempo máximo que uma saída pode permanecer travada em nível ativo. */
export const MAX_HOLD_MS = 3_600_000;
/** Piso do intervalo entre acionamentos, mesmo se a porta pedir menos. */
export const ABSOLUTE_MIN_INTERVAL_MS = 250;

export interface IoPortConfig {
  id: string;
  direction: IoDirection;
  enabled: boolean;
  outputMode: IoOutputMode;
  /** Duração padrão do pulso quando o comando não informa uma. */
  pulseMs: number;
  /** Intervalo mínimo pedido pela porta; o piso absoluto ainda se aplica. */
  minIntervalMs: number;
  lastState: IoPortState;
  /** Epoch ms do último acionamento aceito. `null` = nunca acionada. */
  lastActuatedAtMs: number | null;
  /** Epoch ms em que a saída entrou em nível ativo, se travada. */
  activeSinceMs?: number | null;
}

export interface IoCommand {
  kind: IoCommandKind;
  /** Só relevante em `pulse`. Ausente = usa o padrão da porta. */
  durationMs?: number | null;
}

export interface IoDecisionAllowed {
  allowed: true;
  kind: IoCommandKind;
  /** Duração efetiva em ms; `null` para comandos sem duração. */
  effectiveMs: number | null;
  /** Instante em que a porta volta a aceitar comandos não-desligantes. */
  nextAllowedAtMs: number;
}

export interface IoDecisionRefused {
  allowed: false;
  reason: IoRefusalReason;
  /** Preenchido em `too_soon`: quanto falta esperar, em ms. */
  retryAfterMs?: number;
}

export type IoDecision = IoDecisionAllowed | IoDecisionRefused;

function refuse(reason: IoRefusalReason, retryAfterMs?: number): IoDecisionRefused {
  return retryAfterMs === undefined ? { allowed: false, reason } : { allowed: false, reason, retryAfterMs };
}

/** Intervalo efetivo: o maior entre o pedido pela porta e o piso absoluto (S4). */
export function effectiveMinIntervalMs(port: Pick<IoPortConfig, 'minIntervalMs'>): number {
  const asked = Number.isFinite(port.minIntervalMs) ? port.minIntervalMs : 0;
  return Math.max(ABSOLUTE_MIN_INTERVAL_MS, Math.trunc(asked));
}

export interface IoDecisionInput {
  /** `null`/`undefined` quando a porta não existe ou não pertence ao chamador. */
  port: IoPortConfig | null | undefined;
  command: IoCommand;
  /** O chamador possui `cameras.control_io`? Resolvido no servidor. */
  hasCapability: boolean;
  nowMs: number;
}

/**
 * Veredito único de acionamento. Puro, total e determinístico.
 *
 * A ordem das checagens é intencional: autorização antes de existência de
 * detalhe, e desligamento antes de limitador de taxa (S1).
 */
export function decideActuation({
  port,
  command,
  hasCapability,
  nowMs,
}: IoDecisionInput): IoDecision {
  // I4 — autorização primeiro. Nunca revelamos detalhe de porta a quem não pode agir.
  if (!hasCapability) return refuse('missing_capability');
  if (!port) return refuse('unknown_port');

  // S6 — entrada é leitura, nunca escrita.
  if (port.direction !== 'output') return refuse('not_an_output');
  if (!port.enabled) return refuse('port_disabled');

  const interval = effectiveMinIntervalMs(port);
  const since = port.lastActuatedAtMs == null ? Number.POSITIVE_INFINITY : nowMs - port.lastActuatedAtMs;

  // S1 — desligar sempre passa (dado capacidade e porta de saída habilitada).
  if (command.kind === 'set_inactive') {
    return {
      allowed: true,
      kind: 'set_inactive',
      effectiveMs: null,
      nextAllowedAtMs: nowMs + interval,
    };
  }

  // S3 — manter nível exige equipamento que saiba manter.
  if (command.kind === 'set_active' && port.outputMode !== 'bistable') {
    return refuse('hold_not_supported');
  }

  // Comando redundante: a saída já está no estado pedido. Recusar em vez de
  // gravar uma linha de trilha que não mudou nada — trilha que mente é pior
  // que trilha ausente. `unknown` NÃO é redundante: revalidar é legítimo.
  if (command.kind === 'set_active' && port.lastState === 'active') {
    return refuse('already_in_state');
  }

  // S4 — limitador de taxa protege o contato mecânico.
  if (since < interval) {
    return refuse('too_soon', Math.max(0, Math.ceil(interval - since)));
  }

  if (command.kind === 'set_active') {
    return { allowed: true, kind: 'set_active', effectiveMs: null, nextAllowedAtMs: nowMs + interval };
  }

  // S2 — duração do pulso com teto duro.
  const asked = command.durationMs == null ? port.pulseMs : command.durationMs;
  const duration = Number.isFinite(asked) ? Math.trunc(asked as number) : Number.NaN;
  if (!Number.isFinite(duration) || duration < MIN_PULSE_MS) return refuse('duration_too_short');
  if (duration > MAX_PULSE_MS) return refuse('duration_too_long');

  return {
    allowed: true,
    kind: 'pulse',
    effectiveMs: duration,
    // Após um pulso, o intervalo conta a partir do FIM do pulso: durante o
    // pulso o relé já está comutado e um novo comando não faria sentido.
    nextAllowedAtMs: nowMs + duration + interval,
  };
}

/**
 * S5 — a saída está travada em nível ativo há tempo demais?
 *
 * Usado pelo vigilante que solta a saída sozinho. Retorna `false` para porta de
 * entrada, porta desabilitada, estado desconhecido ou ausência de carimbo — na
 * dúvida NÃO mexemos no equipamento por conta própria.
 */
export function shouldAutoRelease(
  port: Pick<IoPortConfig, 'direction' | 'lastState' | 'activeSinceMs'>,
  nowMs: number,
  maxHoldMs: number = MAX_HOLD_MS,
): boolean {
  if (port.direction !== 'output') return false;
  if (port.lastState !== 'active') return false;
  if (port.activeSinceMs == null) return false;
  return nowMs - port.activeSinceMs >= maxHoldMs;
}

/** Rótulos em PT-BR para explicar a recusa ao operador, sem jargão. */
export const IO_REFUSAL_LABELS: Record<IoRefusalReason, string> = {
  unknown_port: 'Porta não encontrada nesta câmera.',
  missing_capability: 'Você não tem permissão para acionar saídas.',
  port_disabled: 'Esta porta está desativada no cadastro.',
  not_an_output: 'Esta porta é uma entrada e não pode ser acionada.',
  duration_too_short: `Pulso muito curto — mínimo de ${MIN_PULSE_MS} ms.`,
  duration_too_long: `Pulso muito longo — máximo de ${MAX_PULSE_MS / 1000} s. Use "manter ligado".`,
  hold_not_supported: 'Esta saída volta sozinha ao repouso e não pode ficar travada.',
  too_soon: 'Aguarde um instante antes de acionar de novo.',
  already_in_state: 'A saída já está neste estado.',
};
