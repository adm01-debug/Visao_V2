/**
 * Onda 173 — a ciência não atravessa a passagem de turno.
 *
 * A Onda 172 tornou o reconhecimento durável (sobrevive a F5) e revogável por
 * fato novo. Ficou um buraco de operação, não de código: o livro de ciência é
 * do *dispositivo*, não da *pessoa*. Quando o turno vira, o operador que assume
 * herda uma fila já filtrada por um "eu já vi" que **não é dele**. Pendências
 * graves ficam invisíveis por até 4h (o TTL da 172) só porque o colega do turno
 * anterior clicou "ciente" antes de ir embora.
 *
 * Este módulo fecha esse buraco com uma regra única:
 *
 *   **ciência dada antes do início do turno atual não vale para quem assume —
 *   mas nunca desaparece em silêncio: vira dívida herdada, visível e nomeada.**
 *
 * Regras invioláveis:
 *
 *  1. **Corte pelo início do turno.** `at < shiftStartedAt` revoga; `at >=
 *     shiftStartedAt` permanece. O limite é o instante do turno, nunca o TTL —
 *     turno de 20 minutos também zera a fila herdada.
 *  2. **Revogar não é apagar a história.** Toda ciência derrubada aqui produz
 *     um item de herança com o carimbo original (quem viu, quando, em que
 *     estado), para o relatório de passagem e para a tela.
 *  3. **Dívida é sobre fato vivo.** Só entra na herança a ciência que ainda tem
 *     entrada no relógio de atenção. Ciência de câmera já normalizada é higiene
 *     (a 172 já limpa como `resolved`), não dívida a cobrar de ninguém.
 *  4. **Agravamento continua mandando.** Se o estado piorou desde o
 *     reconhecimento, o item herdado é marcado `escalated`: o novo operador
 *     precisa saber que o que foi visto era menos grave do que o que ele achou.
 *  5. **Dado ruim nunca revoga.** `shiftStartedAt` ausente/não finito, ou
 *     `now` inválido, resulta em no-op. Perder ciência por relógio quebrado
 *     treinaria o operador a desconfiar do livro.
 *  6. **Idempotência.** Rodar duas vezes com o mesmo `shiftStartedAt` não muda
 *     nada na segunda: o que sobrou é, por definição, posterior ao corte.
 *  7. **Ordem determinística.** Mais grave primeiro; empate, atenção mais
 *     antiga primeiro; empate, `cameraId` — a mesma escada da 171/169.
 *  8. **Puro e imutável.** Sem `Date.now()`, sem DOM, sem rede, sem mutação
 *     das estruturas recebidas.
 */

import type { AttentionEntry, AttentionLedger } from './attentionClock';
import { attentionAge } from './attentionClock';
import { severityRank, type MapMarkerStatus } from './floorPlanGeometry';
import type { AckLedger, AckRecord } from './triageAck';

/** Ciência do turno anterior sobre um fato que continua aberto (regra 2/3). */
export interface InheritedAck {
  cameraId: string;
  /** Quando a ciência foi dada (turno anterior). */
  ackedAt: number;
  /** Estado que estava reconhecido naquele instante. */
  ackedStatus: MapMarkerStatus;
  /** Estado atual da câmera no relógio de atenção. */
  currentStatus: MapMarkerStatus;
  /** Início da janela contínua de atenção ainda em curso. */
  openedAt: number;
  /** Idade da atenção no instante da passagem. */
  ageMs: number;
  /** Regra 4: piorou desde que alguém disse "ciente". */
  escalated: boolean;
}

export interface AckHandoffResult {
  /** Livro após o corte: só ciência dada dentro do turno atual. */
  acks: AckLedger;
  /** Ciências derrubadas pelo corte cujo fato segue aberto (regra 3). */
  inherited: readonly InheritedAck[];
  /** Ciências derrubadas cujo fato já não existe — contagem, sem dívida. */
  stale: number;
  /** `false` quando nada mudou (regra 6) — evita re-render/gravação inútil. */
  changed: boolean;
}

const EMPTY_RESULT_INHERITED: readonly InheritedAck[] = Object.freeze([]);

const isClock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function compareInherited(a: InheritedAck, b: InheritedAck): number {
  const bySeverity = severityRank(a.currentStatus) - severityRank(b.currentStatus);
  if (bySeverity !== 0) return bySeverity;
  if (b.ageMs !== a.ageMs) return b.ageMs - a.ageMs;
  return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0;
}

function toInherited(record: AckRecord, entry: AttentionEntry, now: number): InheritedAck {
  return {
    cameraId: record.cameraId,
    ackedAt: record.at,
    ackedStatus: record.status,
    currentStatus: entry.status,
    openedAt: entry.openedAt,
    ageMs: attentionAge(entry, now),
    escalated:
      severityRank(entry.status) < severityRank(record.status) ||
      severityRank(entry.worst) < severityRank(record.worst),
  };
}

/**
 * Aplica o corte de turno sobre o livro de ciência.
 *
 * Nunca lança; nunca cria ciência; só remove o que pertence ao turno anterior.
 */
export function handoffAcks(
  acks: AckLedger,
  ledger: AttentionLedger,
  shiftStartedAt: number,
  now: number,
): AckHandoffResult {
  const unchanged: AckHandoffResult = {
    acks,
    inherited: EMPTY_RESULT_INHERITED,
    stale: 0,
    changed: false,
  };
  // Regra 5: dado ruim nunca revoga.
  if (!isClock(shiftStartedAt) || !isClock(now)) return unchanged;

  const ids = Object.keys(acks);
  if (ids.length === 0) return unchanged;

  const kept: Record<string, AckRecord> = {};
  const inherited: InheritedAck[] = [];
  let stale = 0;
  let removed = 0;

  for (const id of ids) {
    const record = acks[id];
    if (!record) continue;
    // Regra 1: o corte é o instante do turno.
    if (isClock(record.at) && record.at >= shiftStartedAt) {
      kept[id] = record;
      continue;
    }
    removed += 1;
    const entry = ledger?.[id];
    if (!entry) {
      // Regra 3: sem fato vivo não há dívida a cobrar.
      stale += 1;
      continue;
    }
    inherited.push(toInherited(record, entry, now));
  }

  if (removed === 0) return unchanged;

  inherited.sort(compareInherited); // regra 7
  return { acks: kept, inherited, stale, changed: true };
}

export interface AckHandoffSummary {
  total: number;
  escalated: number;
  /** Pior estado atual entre os itens herdados (`null` quando não há herança). */
  worst: MapMarkerStatus | null;
  /** Item herdado com atenção mais antiga. */
  oldest: InheritedAck | null;
}

/** Resumo para cabeçalho/badge — deriva, não recalcula regra. */
export function summarizeAckHandoff(inherited: readonly InheritedAck[]): AckHandoffSummary {
  let escalated = 0;
  let worst: MapMarkerStatus | null = null;
  let oldest: InheritedAck | null = null;
  for (const item of inherited) {
    if (item.escalated) escalated += 1;
    if (worst === null || severityRank(item.currentStatus) < severityRank(worst)) {
      worst = item.currentStatus;
    }
    if (oldest === null || item.ageMs > oldest.ageMs) oldest = item;
  }
  return { total: inherited.length, escalated, worst, oldest };
}

const STATUS_TEXT: Record<MapMarkerStatus, string> = {
  alert: 'EM ALERTA',
  offline: 'FORA DO AR',
  warning: 'COM AVISO',
  unknown: 'SEM ESTADO',
  online: 'OPERANDO',
};

/** Bloco de texto para o relatório de passagem (regra 2). */
export function formatInheritedAcks(
  inherited: readonly InheritedAck[],
  nameOf: (cameraId: string) => string,
  formatAge: (ms: number) => string,
): readonly string[] {
  if (inherited.length === 0) return [];
  const lines: string[] = ['CIÊNCIA DO TURNO ANTERIOR (revalidar):'];
  for (const item of inherited) {
    lines.push(
      `  - ${nameOf(item.cameraId)}: ${STATUS_TEXT[item.currentStatus]} há ${formatAge(item.ageMs)}` +
        ` · ciente como ${STATUS_TEXT[item.ackedStatus]}` +
        `${item.escalated ? ' · AGRAVOU desde o reconhecimento' : ''}`,
    );
  }
  return lines;
}
