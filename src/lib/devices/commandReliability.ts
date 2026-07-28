/**
 * Onda 196 — Reputação de obediência ao comando.
 *
 * As Ondas 193–195 tratam **uma ordem por vez**: admitir, entregar, cobrar,
 * varrer. Nenhuma delas responde a pergunta que o mantenedor realmente faz:
 * *"em quais equipamentos eu ainda posso confiar quando mando reiniciar?"*
 *
 * Um gravador que engole três ordens seguidas e depois responde a quarta não
 * dispara nenhum alerta nas ondas anteriores — cada ordem, isoladamente, teve
 * um desfecho legítimo. O padrão só aparece quando se olha a série. E é o
 * padrão que decide se o operador deve subir no telhado.
 *
 * ## O que esta régua recusa a fazer
 *
 * 1. **Não confunde ausência de prova com prova de culpa.** Ordem encerrada
 *    pela varredura (`settledBy === 'sweep'`) é *ausência observada*: entra na
 *    conta de silêncio, nunca na conta de falha declarada. Um equipamento que
 *    responde honestamente "falhei" é mais saudável que um que some — e o
 *    ranking precisa refletir isso, senão o mantenedor troca o aparelho errado.
 *
 * 2. **Não julga amostra pequena.** Abaixo de {@link MIN_SAMPLE} ordens
 *    encerradas o veredito é `insufficient_evidence` — nunca `healthy`. "Não
 *    sei" e "está bom" são estados diferentes; achatá-los faria um equipamento
 *    recém-instalado nascer aprovado.
 *
 * 3. **Não usa média simples.** A taxa observada de uma amostra curta é ruído.
 *    O corte usa o **piso do intervalo de Wilson a 95%** — a mesma régua já
 *    adotada na saúde de reentrega (Onda 122) — para que 2 silêncios em 3
 *    ordens não sejam tratados como 66% de doença estabelecida.
 *
 * 4. **Não oscila.** Histerese de {@link HYSTERESIS} pontos percentuais: para
 *    piorar exige-se ultrapassar o corte; para melhorar exige-se ficar abaixo
 *    do corte menos a folga. Sem isso o painel pisca a cada ordem nova.
 *
 * 5. **Não conta ordem viva.** Só retratos terminais entram na estatística.
 *    Ordem em execução ainda pode terminar bem; contá-la como falha seria
 *    condenar antes do fato.
 *
 * 6. **Não esquece o ato físico.** Silêncio em `device.reboot` pesa mais que
 *    silêncio em `config.read`: a primeira pode ter reiniciado o gravador sem
 *    ninguém saber. O veredito registra esse recorte separado para que a
 *    decisão do mantenedor seja informada, mas **nunca** o usa para reduzir a
 *    gravidade — só para elevá-la.
 *
 * Regra pura: sem rede, sem relógio próprio, sem I/O. O instante de corte é
 * sempre recebido.
 */

/** Mínimo de ordens encerradas para haver veredito. Abaixo disso: "não sei". */
export const MIN_SAMPLE = 5;

/** Corte de silêncio (piso de Wilson) a partir do qual o equipamento é suspeito. */
export const SUSPECT_THRESHOLD = 0.2;

/** Corte de silêncio a partir do qual o equipamento é considerado surdo. */
export const DEAF_THRESHOLD = 0.5;

/** Folga de histerese, em fração, aplicada na volta (melhora). */
export const HYSTERESIS = 0.05;

/** Comandos que produzem efeito físico observável no equipamento. */
const EFFECTFUL_COMMANDS = new Set(['device.reboot', 'osd.write']);

/** Estados terminais da fila (espelho do CHECK de `device_remote_commands`). */
export type TerminalStatus = 'completed' | 'failed' | 'expired' | 'cancelled';

export interface CommandOutcome {
  readonly registrationId: string;
  readonly command: string;
  /** Estado final; estados não terminais são ignorados pela régua. */
  readonly status: string;
  /** Quem encerrou: `device` (laudo) ou `sweep` (ausência observada). */
  readonly settledBy: 'device' | 'sweep' | null;
  /** Instante do encerramento, em ms. `null` = retrato incompleto. */
  readonly settledAt: number | null;
}

export type ReliabilityState =
  /** Amostra insuficiente — nunca confundir com saúde. */
  | 'insufficient_evidence'
  /** Responde, e a maioria dos laudos chega. */
  | 'healthy'
  /** Responde às vezes; silêncio acima do tolerável. */
  | 'suspect'
  /** Silêncio predominante: ordens somem sem laudo. */
  | 'deaf'
  /** Responde sempre, mas declarando falha: problema é de execução, não de rede. */
  | 'failing';

export interface ReliabilityVerdict {
  readonly registrationId: string;
  /** Ordens terminais consideradas dentro da janela. */
  readonly sample: number;
  /** Encerradas por ausência (varredura). */
  readonly silent: number;
  /** Encerradas com laudo de falha declarada pelo equipamento. */
  readonly declaredFailures: number;
  /** Encerradas com laudo de sucesso. */
  readonly completed: number;
  /** Ordens de efeito físico encerradas por ausência — destino desconhecido. */
  readonly unresolvedEffectful: number;
  /** Taxa observada de silêncio (bruta, só para exibição). */
  readonly silentRate: number;
  /** Piso de Wilson 95% da taxa de silêncio — a régua da decisão. */
  readonly silentLowerBound: number;
  readonly state: ReliabilityState;
  /** `null` quando não há nada a fazer. */
  readonly severity: 'warning' | 'critical' | null;
}

const isTerminal = (status: string): status is TerminalStatus =>
  status === 'completed' || status === 'failed' || status === 'expired' || status === 'cancelled';

/**
 * Piso do intervalo de Wilson a 95% (z = 1.96).
 *
 * Escolhido em vez da proporção simples porque a decisão aqui é "há doença
 * estabelecida?", e não "qual foi a média da semana". Com amostra curta o piso
 * cai perto de zero — exatamente o comportamento desejado: pouca evidência não
 * condena ninguém.
 */
export function wilsonLowerBound(successes: number, total: number): number {
  if (total <= 0) return 0;
  const z = 1.96;
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  const lower = (centre - margin) / denominator;
  return lower < 0 ? 0 : lower > 1 ? 1 : lower;
}

/**
 * Aplica histerese contra o estado anterior. Sem estado anterior, o corte é o
 * corte — a primeira leitura não tem de onde "voltar".
 */
const crossed = (bound: number, threshold: number, wasAtOrAbove: boolean): boolean =>
  wasAtOrAbove ? bound >= threshold - HYSTERESIS : bound >= threshold;

export interface ClassifyOptions {
  /** Estado do ciclo anterior, para histerese. */
  readonly previous?: ReliabilityState | null;
  /** Corte inferior da janela, em ms. Ordens anteriores são ignoradas. */
  readonly since?: number | null;
}

/**
 * Veredito de um equipamento a partir dos retratos de suas ordens.
 *
 * Ordens não terminais, de outros equipamentos, ou anteriores à janela são
 * descartadas antes de qualquer conta — a amostra precisa ser exatamente o que
 * o veredito declara ter olhado.
 */
export function classifyCommandReliability(
  registrationId: string,
  outcomes: readonly CommandOutcome[],
  options: ClassifyOptions = {},
): ReliabilityVerdict {
  const since = options.since ?? null;
  const previous = options.previous ?? null;

  const considered = outcomes.filter(
    (o) =>
      o.registrationId === registrationId &&
      isTerminal(o.status) &&
      o.settledAt !== null &&
      (since === null || o.settledAt >= since),
  );

  const sample = considered.length;
  // Ausência observada: a varredura encerrou porque ninguém prestou contas.
  const silentRows = considered.filter((o) => o.settledBy === 'sweep');
  const silent = silentRows.length;
  const declaredFailures = considered.filter(
    (o) => o.settledBy === 'device' && o.status === 'failed',
  ).length;
  const completed = considered.filter((o) => o.status === 'completed').length;
  const unresolvedEffectful = silentRows.filter((o) => EFFECTFUL_COMMANDS.has(o.command)).length;

  const silentRate = sample === 0 ? 0 : silent / sample;
  const silentLowerBound = wilsonLowerBound(silent, sample);

  if (sample < MIN_SAMPLE) {
    return {
      registrationId,
      sample,
      silent,
      declaredFailures,
      completed,
      unresolvedEffectful,
      silentRate,
      silentLowerBound,
      state: 'insufficient_evidence',
      // Evidência insuficiente não gera chamado: geraria ruído em toda
      // instalação nova e treinaria o mantenedor a ignorar o painel.
      severity: null,
    };
  }

  const wasDeaf = previous === 'deaf';
  const wasSuspect = previous === 'suspect' || previous === 'deaf';

  let state: ReliabilityState;
  if (crossed(silentLowerBound, DEAF_THRESHOLD, wasDeaf)) {
    state = 'deaf';
  } else if (crossed(silentLowerBound, SUSPECT_THRESHOLD, wasSuspect)) {
    state = 'suspect';
  } else if (declaredFailures > completed) {
    // Responde sempre, mas falha ao executar: a rede está boa, o aparelho não.
    // Rótulo separado porque a ação corretiva é outra (firmware/config, não
    // conectividade).
    state = 'failing';
  } else {
    state = 'healthy';
  }

  let severity: 'warning' | 'critical' | null =
    state === 'deaf' ? 'critical' : state === 'suspect' || state === 'failing' ? 'warning' : null;

  // Ato físico de destino desconhecido só eleva, nunca reduz: pode haver
  // gravador reiniciado sem registro.
  if (unresolvedEffectful > 0 && severity === null) severity = 'warning';

  return {
    registrationId,
    sample,
    silent,
    declaredFailures,
    completed,
    unresolvedEffectful,
    silentRate,
    silentLowerBound,
    state,
    severity,
  };
}

const STATE_RANK: Record<ReliabilityState, number> = {
  deaf: 0,
  suspect: 1,
  failing: 2,
  healthy: 3,
  insufficient_evidence: 4,
};

/** Pior primeiro; empate desfeito por silêncio e depois por identidade estável. */
export function compareReliability(a: ReliabilityVerdict, b: ReliabilityVerdict): number {
  const byState = STATE_RANK[a.state] - STATE_RANK[b.state];
  if (byState !== 0) return byState;
  const byBound = b.silentLowerBound - a.silentLowerBound;
  if (byBound !== 0) return byBound;
  return a.registrationId.localeCompare(b.registrationId);
}

export interface ReliabilitySummary {
  readonly total: number;
  readonly deaf: number;
  readonly suspect: number;
  readonly failing: number;
  readonly healthy: number;
  readonly unknown: number;
  readonly actionable: number;
}

export function summarizeReliability(
  verdicts: readonly ReliabilityVerdict[],
): ReliabilitySummary {
  return {
    total: verdicts.length,
    deaf: verdicts.filter((v) => v.state === 'deaf').length,
    suspect: verdicts.filter((v) => v.state === 'suspect').length,
    failing: verdicts.filter((v) => v.state === 'failing').length,
    healthy: verdicts.filter((v) => v.state === 'healthy').length,
    unknown: verdicts.filter((v) => v.state === 'insufficient_evidence').length,
    actionable: verdicts.filter((v) => v.severity !== null).length,
  };
}

/** Veredito por equipamento, já ordenado por urgência. */
export function classifyFleetReliability(
  outcomes: readonly CommandOutcome[],
  options: Omit<ClassifyOptions, 'previous'> & {
    readonly previous?: Readonly<Record<string, ReliabilityState>>;
  } = {},
): readonly ReliabilityVerdict[] {
  const ids = [...new Set(outcomes.map((o) => o.registrationId))];
  const previousMap = options.previous ?? {};
  return ids
    .map((id) =>
      classifyCommandReliability(id, outcomes, {
        since: options.since ?? null,
        previous: previousMap[id] ?? null,
      }),
    )
    .sort(compareReliability);
}
