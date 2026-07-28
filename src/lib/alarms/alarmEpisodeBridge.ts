/**
 * Onda 181 — ponte entre a agregação de alarme (Onda 178) e o livro de
 * reincidência (Ondas 179/180).
 *
 * A agregação decide **quando** o episódio abre e fecha. O livro de
 * reincidência guarda **o histórico** desses episódios. Até aqui, quem ligava
 * os dois era o chamador — e é exatamente aí que uma implementação ingênua
 * corrompe a estatística: rearme virando episódio novo, evento ignorado
 * mexendo no livro, ou comando de escrita emitido para uma mutação que o
 * banco recusaria.
 *
 * Este módulo é a regra única dessa tradução. Ele é puro, determinístico e
 * nunca muta as entradas; devolve o livro novo e a lista de comandos que
 * devem ser enviados às RPCs `record_alarm_episode_open` /
 * `record_alarm_episode_close`.
 *
 * Invariantes:
 *
 * 1. **Evento ignorado nunca move o livro.** Se a agregação recusou o reporte
 *    (fora de agenda, origem desconhecida, atrasado…), não há fato novo.
 * 2. **Rearme não é episódio novo.** Rearme é reencontro com um alarme que já
 *    existia; contá-lo como abertura inflaria a reincidência e faria uma
 *    simples reconexão parecer defeito crônico.
 * 3. **O carimbo é o do fato, não o do relógio de parede.** A abertura usa
 *    `state.openedAt` e o fechamento usa `state.lastAcceptedAt`, os carimbos
 *    que a agregação aceitou.
 * 4. **Comando só existe se a mutação foi aceita.** O livro local é espelho do
 *    servidor: se a mutação foi recusada aqui, mandá-la ao banco só produziria
 *    divergência entre os dois lados.
 * 5. **Reconciliação nunca inventa episódio.** Ao ressincronizar, abre com a
 *    abertura real do episódio em curso e fecha com o último carimbo aceito.
 */

import {
  closeEpisode,
  openEpisode,
  type RecurrenceConfig,
  type RecurrenceIgnoreReason,
  type RecurrenceLedger,
  type RecurrenceSeverity,
} from './alarmRecurrence';
import type { AggregationResult, EpisodeState } from './alarmAggregation';

/** Comando de escrita durável, espelho das RPCs da Onda 180. */
export type EpisodeCommand =
  | { kind: 'open'; seriesKey: string; at: number; severity: RecurrenceSeverity }
  | { kind: 'close'; seriesKey: string; at: number };

export type BridgeSkipReason =
  /** A agregação ignorou o reporte — não há fato a registrar (invariante 1). */
  | 'event_ignored'
  /** Transição que não abre nem fecha episódio (`none`/`sustained`). */
  | 'no_episode_change'
  /** Rearme sobre episódio já registrado (invariante 2). */
  | 'rearm_already_recorded'
  /** Entrada malformada (chave vazia, severidade inválida, carimbo ausente). */
  | 'invalid_input'
  /** O livro recusou a mutação; o motivo exato vem em `rejected`. */
  | 'ledger_rejected';

export interface BridgeOutcome {
  ledger: RecurrenceLedger;
  commands: readonly EpisodeCommand[];
  skipped: BridgeSkipReason | null;
  /** Motivo devolvido pelo livro quando `skipped === 'ledger_rejected'`. */
  rejected: RecurrenceIgnoreReason | null;
}

export interface BridgeInput {
  /** Chave da série; normalmente `${ruleId}:${scopeId}`. */
  seriesKey: string;
  /** Severidade da regra no momento da abertura. */
  severity: RecurrenceSeverity;
  cfg?: Partial<RecurrenceConfig> | null;
}

const isClock = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const SEVERITIES: readonly RecurrenceSeverity[] = ['low', 'medium', 'high', 'critical'];

const isSeverity = (v: unknown): v is RecurrenceSeverity =>
  typeof v === 'string' && (SEVERITIES as readonly string[]).includes(v);

const isKey = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const skip = (
  ledger: RecurrenceLedger,
  reason: BridgeSkipReason,
  rejected: RecurrenceIgnoreReason | null = null,
): BridgeOutcome => ({ ledger, commands: [], skipped: reason, rejected });

const applyOpen = (
  ledger: RecurrenceLedger,
  seriesKey: string,
  at: number,
  severity: RecurrenceSeverity,
  cfg?: Partial<RecurrenceConfig> | null,
): BridgeOutcome => {
  const mutation = openEpisode(ledger, { at, severity }, cfg);
  if (mutation.ignored !== null) {
    return skip(mutation.ledger, 'ledger_rejected', mutation.ignored);
  }
  return {
    ledger: mutation.ledger,
    commands: [{ kind: 'open', seriesKey, at, severity }],
    skipped: null,
    rejected: null,
  };
};

const applyClose = (
  ledger: RecurrenceLedger,
  seriesKey: string,
  at: number,
  cfg?: Partial<RecurrenceConfig> | null,
): BridgeOutcome => {
  const mutation = closeEpisode(ledger, { at }, cfg);
  if (mutation.ignored !== null) {
    return skip(mutation.ledger, 'ledger_rejected', mutation.ignored);
  }
  return {
    ledger: mutation.ledger,
    commands: [{ kind: 'close', seriesKey, at }],
    skipped: null,
    rejected: null,
  };
};

/**
 * Traduz uma transição da agregação em, no máximo, um comando de episódio.
 *
 * Devolve sempre um resultado: transições sem efeito não são erro, são o caso
 * comum (a maioria dos reportes apenas sustenta o episódio corrente).
 */
export function bridgeAggregation(
  ledger: RecurrenceLedger,
  result: AggregationResult,
  input: BridgeInput,
): BridgeOutcome {
  if (!ledger || typeof ledger !== 'object' || !result || typeof result !== 'object') {
    return skip(ledger, 'invalid_input');
  }
  if (!isKey(input?.seriesKey) || !isSeverity(input?.severity)) {
    return skip(ledger, 'invalid_input');
  }

  // Invariante 1: o que a agregação recusou não é fato.
  if (result.ignored !== null) return skip(ledger, 'event_ignored');

  const state: EpisodeState | undefined = result.state;
  const cfg = input.cfg ?? null;

  switch (result.transition) {
    case 'opened': {
      const at = state?.openedAt;
      if (!isClock(at)) return skip(ledger, 'invalid_input');
      return applyOpen(ledger, input.seriesKey, at, input.severity, cfg);
    }

    case 'rearmed': {
      // Invariante 2: se o livro já tem o episódio, rearme não registra nada.
      if (ledger.openIndex !== null) return skip(ledger, 'rearm_already_recorded');
      const at = state?.openedAt;
      if (!isClock(at)) return skip(ledger, 'invalid_input');
      // Invariante 3/5: abre com o começo real do alarme, não com "agora".
      return applyOpen(ledger, input.seriesKey, at, input.severity, cfg);
    }

    case 'closed': {
      // Fechar sem nada aberto no livro é dessincronia, não fato novo.
      if (ledger.openIndex === null) return skip(ledger, 'no_episode_change');
      const at = state?.lastAcceptedAt;
      if (!isClock(at)) return skip(ledger, 'invalid_input');
      return applyClose(ledger, input.seriesKey, at, cfg);
    }

    default:
      return skip(ledger, 'no_episode_change');
  }
}

/**
 * Ressincroniza o livro com o estado corrente da agregação.
 *
 * Serve para o primeiro contato da sessão e para recuperação após queda: o
 * livro pode ter perdido eventos, mas o estado da agregação é a verdade do
 * momento. A reconciliação corrige a divergência sem inventar histórico —
 * no máximo um comando, sempre com carimbo de fato observado.
 */
export function reconcileLedger(
  ledger: RecurrenceLedger,
  state: EpisodeState,
  input: BridgeInput,
): BridgeOutcome {
  if (!ledger || typeof ledger !== 'object' || !state || typeof state !== 'object') {
    return skip(ledger, 'invalid_input');
  }
  if (!isKey(input?.seriesKey) || !isSeverity(input?.severity)) {
    return skip(ledger, 'invalid_input');
  }

  const cfg = input.cfg ?? null;
  const aggregationOpen = isClock(state.openedAt);
  const ledgerOpen = ledger.openIndex !== null;

  if (aggregationOpen && !ledgerOpen) {
    const onset = state.openedAt as number;
    // O alarme pode ter começado antes do último fato que o livro aceitou
    // (perdemos eventos). Reescrever o passado é proibido, mas deixar o livro
    // divergente da realidade é pior: registramos a abertura no instante mais
    // antigo que ainda é honesto — o último carimbo aceito. A série ganha o
    // episódio; só a duração fica subestimada, nunca inventada.
    const floor = ledger.lastAcceptedAt;
    const at = isClock(floor) && onset < floor ? floor : onset;
    return applyOpen(ledger, input.seriesKey, at, input.severity, cfg);
  }

  if (!aggregationOpen && ledgerOpen) {
    const at = state.lastAcceptedAt;
    // Sem carimbo aceito não há prova de quando terminou: deixamos aberto em
    // vez de fabricar um fim (duração inventada viraria chatter falso).
    if (!isClock(at)) return skip(ledger, 'no_episode_change');
    return applyClose(ledger, input.seriesKey, at, cfg);
  }

  return skip(ledger, 'no_episode_change');
}

const SKIP_LABEL: Readonly<Record<BridgeSkipReason, string>> = Object.freeze({
  event_ignored: 'Evento recusado pela agregação',
  no_episode_change: 'Sem mudança de episódio',
  rearm_already_recorded: 'Rearme de episódio já registrado',
  invalid_input: 'Entrada inválida',
  ledger_rejected: 'Livro recusou o registro',
});

export const bridgeSkipLabel = (reason: BridgeSkipReason): string =>
  SKIP_LABEL[reason] ?? reason;
