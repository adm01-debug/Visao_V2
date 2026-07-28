/**
 * Onda 169 — passagem de turno (o que o próximo operador precisa saber).
 *
 * O relógio de atenção (Onda 168) responde "há quanto tempo isto está assim",
 * mas ele é um retrato do **agora**: quando a câmera normaliza, a entrada
 * desaparece e a ocorrência evapora junto. Isso é correto para a fila de
 * trabalho e desastroso para a troca de turno — quem entra às 22h não tem como
 * saber que três câmeras do 2º andar caíram e voltaram cinco vezes na última
 * hora, nem que a portaria está fora do ar desde antes do turno anterior.
 *
 * Este módulo é o **diário do turno**: append-only, puro, sem relógio próprio.
 *
 * Regras (cada uma existe porque a alternativa mente na passagem):
 *
 *  1. **Reconhecer não é resolver.** "Ciente" tira a linha da fila, nunca da
 *     passagem: fecha como pendência reconhecida e jamais entra em
 *     "normalizado". Confundir os dois transforma o botão num apagador de
 *     incidentes.
 *  2. **Herdado nunca é apresentado como novo.** Item aberto antes do início
 *     do turno é herança (`inherited`); contá-lo como surgido no turno
 *     inflaria a culpa de quem estava na mesa.
 *  3. **Sumiu não é normalizou.** Câmera removida da planta / do escopo fecha
 *     como `removed`, categoria própria. Ausência de observação nunca é prova
 *     de melhora (mesma lei da Onda 168).
 *  4. **Contagem nunca mente por causa do teto.** O diário guarda no máximo
 *     `maxClosures` registros detalhados, mas mantém contadores absolutos
 *     (`totals`) que incluem o que foi descartado — resumo truncado é aceitável,
 *     resumo errado não.
 *  5. **Registro é idempotente.** O mesmo fechamento (câmera + abertura +
 *     fechamento + motivo) nunca é gravado duas vezes; efeitos React em modo
 *     estrito não podem duplicar a história.
 *  6. **Puro e imutável.** Sem `Date.now()`, sem rede, sem DOM. Chamada que não
 *     muda nada devolve a mesma referência.
 */

import {
  attentionAge,
  formatAge,
  type AttentionEntry,
  type AttentionLedger,
} from './attentionClock';
import { severityRank, type MapMarkerStatus } from './floorPlanGeometry';

/** Por que a atenção deixou de estar aberta. */
export type ShiftClosureReason = 'normalized' | 'acknowledged' | 'removed';

export interface ShiftClosure {
  cameraId: string;
  /** Estado em que a câmera estava no instante do fechamento. */
  status: MapMarkerStatus;
  /** Pior estado observado na janela contínua de atenção. */
  worst: MapMarkerStatus;
  /** Abertura da janela contínua (pode ser anterior ao turno). */
  openedAt: number;
  /** Instante do fechamento. */
  closedAt: number;
  /** Trocas de estado dentro da janela (indício de oscilação). */
  changes: number;
  reason: ShiftClosureReason;
}

export interface ShiftTotals {
  normalized: number;
  acknowledged: number;
  removed: number;
}

export interface ShiftJournal {
  /** Início do turno. Tudo aberto antes disto é herança. */
  startedAt: number;
  /** Fechamentos detalhados, do mais recente para o mais antigo (teto aplicado). */
  closures: readonly ShiftClosure[];
  /** Contadores absolutos — imunes ao teto (regra 4). */
  totals: ShiftTotals;
  /** Quantos fechamentos existiram mas não couberam no detalhe. */
  dropped: number;
}

export interface ShiftJournalConfig {
  /** Teto de fechamentos detalhados guardados em memória. */
  maxClosures: number;
}

export const DEFAULT_JOURNAL_CONFIG: ShiftJournalConfig = { maxClosures: 120 };

const isClock = (value: number): boolean => Number.isFinite(value);

const emptyTotals = (): ShiftTotals => ({ normalized: 0, acknowledged: 0, removed: 0 });

/** Abre um turno. `startedAt` inválido cai em 0 (tudo vira "surgido no turno"). */
export function openShift(startedAt: number): ShiftJournal {
  return {
    startedAt: isClock(startedAt) ? startedAt : 0,
    closures: [],
    totals: emptyTotals(),
    dropped: 0,
  };
}

/**
 * Deriva fechamentos comparando dois estados do relógio de atenção.
 *
 * Quem estava no livro anterior e saiu do novo fechou. O motivo é informado
 * pelo chamador porque só ele sabe *como* saiu: normalização observada,
 * reconhecimento manual ou remoção do escopo (regras 1 e 3).
 */
export function diffClosures(
  previous: AttentionLedger,
  next: AttentionLedger,
  closedAt: number,
  reason: ShiftClosureReason,
): readonly ShiftClosure[] {
  if (!isClock(closedAt)) return [];
  const closures: ShiftClosure[] = [];
  for (const cameraId of Object.keys(previous)) {
    if (next[cameraId]) continue;
    const entry = previous[cameraId];
    if (!entry) continue;
    closures.push(closureOf(entry, closedAt, reason));
  }
  return closures;
}

/** Converte uma entrada do relógio num registro de fechamento. */
export function closureOf(
  entry: AttentionEntry,
  closedAt: number,
  reason: ShiftClosureReason,
): ShiftClosure {
  const safeClose = isClock(closedAt) ? Math.max(closedAt, entry.openedAt) : entry.openedAt;
  return {
    cameraId: entry.cameraId,
    status: entry.status,
    worst: entry.worst,
    openedAt: entry.openedAt,
    closedAt: safeClose,
    changes: entry.changes,
    reason,
  };
}

const sameClosure = (a: ShiftClosure, b: ShiftClosure): boolean =>
  a.cameraId === b.cameraId &&
  a.openedAt === b.openedAt &&
  a.closedAt === b.closedAt &&
  a.reason === b.reason;

/**
 * Acrescenta fechamentos ao diário (append-only, idempotente, com teto).
 */
export function recordClosures(
  journal: ShiftJournal,
  closures: readonly ShiftClosure[],
  config: ShiftJournalConfig = DEFAULT_JOURNAL_CONFIG,
): ShiftJournal {
  if (closures.length === 0) return journal;
  const max = Number.isFinite(config.maxClosures) ? Math.max(1, Math.floor(config.maxClosures)) : 1;

  const accepted: ShiftClosure[] = [];
  for (const closure of closures) {
    if (!closure || typeof closure.cameraId !== 'string' || closure.cameraId.length === 0) continue;
    if (!isClock(closure.openedAt) || !isClock(closure.closedAt)) continue;
    // Regra 5: idempotência contra o já gravado e contra o próprio lote.
    if (journal.closures.some((existing) => sameClosure(existing, closure))) continue;
    if (accepted.some((existing) => sameClosure(existing, closure))) continue;
    accepted.push(closure);
  }
  if (accepted.length === 0) return journal;

  const totals: ShiftTotals = { ...journal.totals };
  for (const closure of accepted) totals[closure.reason] += 1;

  // Mais recente primeiro; empate resolvido pelo id para determinismo.
  const merged = [...accepted, ...journal.closures].sort((a, b) => {
    if (b.closedAt !== a.closedAt) return b.closedAt - a.closedAt;
    return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0;
  });
  const kept = merged.slice(0, max);

  return {
    startedAt: journal.startedAt,
    closures: kept,
    totals,
    dropped: journal.dropped + (merged.length - kept.length),
  };
}

/** Item aberto no instante da passagem. */
export interface ShiftOpenItem {
  cameraId: string;
  status: MapMarkerStatus;
  worst: MapMarkerStatus;
  openedAt: number;
  ageMs: number;
  changes: number;
  /** Verdadeiro quando a atenção começou antes do turno atual (regra 2). */
  inherited: boolean;
}

export interface ShiftHandoff {
  startedAt: number;
  endedAt: number;
  durationMs: number;
  /** Abertos, mais graves primeiro; no empate, mais antigos primeiro. */
  open: readonly ShiftOpenItem[];
  inheritedCount: number;
  arisenCount: number;
  /** Fechados no turno, agrupados por motivo (detalhe sujeito ao teto). */
  closed: Readonly<Record<ShiftClosureReason, readonly ShiftClosure[]>>;
  totals: ShiftTotals;
  dropped: number;
  /** Câmeras com ≥3 trocas de estado — oscilação vale menção explícita. */
  flapping: readonly string[];
  /** Item aberto mais antigo, se houver. */
  oldest: ShiftOpenItem | null;
}

const FLAPPING_THRESHOLD = 3;

/** Monta a passagem de turno a partir do diário + relógio atual. */
export function buildHandoff(
  journal: ShiftJournal,
  ledger: AttentionLedger,
  now: number,
): ShiftHandoff {
  const endedAt = isClock(now) ? now : journal.startedAt;

  const open: ShiftOpenItem[] = Object.values(ledger).map((entry) => ({
    cameraId: entry.cameraId,
    status: entry.status,
    worst: entry.worst,
    openedAt: entry.openedAt,
    ageMs: attentionAge(entry, endedAt),
    changes: entry.changes,
    inherited: entry.openedAt < journal.startedAt,
  }));

  open.sort((a, b) => {
    const bySeverity = severityRank(a.status) - severityRank(b.status);
    if (bySeverity !== 0) return bySeverity;
    if (b.ageMs !== a.ageMs) return b.ageMs - a.ageMs;
    return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0;
  });

  const closed: Record<ShiftClosureReason, ShiftClosure[]> = {
    normalized: [],
    acknowledged: [],
    removed: [],
  };
  for (const closure of journal.closures) closed[closure.reason].push(closure);

  const flappingSet = new Set<string>();
  for (const item of open) if (item.changes >= FLAPPING_THRESHOLD) flappingSet.add(item.cameraId);
  for (const closure of journal.closures) {
    if (closure.changes >= FLAPPING_THRESHOLD) flappingSet.add(closure.cameraId);
  }

  let oldest: ShiftOpenItem | null = null;
  for (const item of open) {
    if (!oldest || item.ageMs > oldest.ageMs) oldest = item;
  }

  return {
    startedAt: journal.startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - journal.startedAt),
    open,
    inheritedCount: open.filter((item) => item.inherited).length,
    arisenCount: open.filter((item) => !item.inherited).length,
    closed,
    totals: journal.totals,
    dropped: journal.dropped,
    flapping: [...flappingSet].sort(),
    oldest,
  };
}

const STATUS_TEXT: Record<MapMarkerStatus, string> = {
  alert: 'EM ALERTA',
  offline: 'FORA DO AR',
  warning: 'COM AVISO',
  unknown: 'SEM ESTADO',
  online: 'OPERANDO',
};

const REASON_TEXT: Record<ShiftClosureReason, string> = {
  normalized: 'normalizadas',
  acknowledged: 'reconhecidas sem normalizar',
  removed: 'saíram do escopo',
};

/**
 * Relatório de texto puro para colar em caderno de turno, e-mail ou ticket.
 * Nada é inventado: só o que está no diário e no relógio.
 */
export function formatHandoffReport(
  handoff: ShiftHandoff,
  nameOf: (cameraId: string) => string,
): string {
  const lines: string[] = [];
  lines.push('PASSAGEM DE TURNO — VISÃO');
  lines.push(`Duração do turno: ${formatAge(handoff.durationMs)}`);
  lines.push('');
  lines.push(
    `ABERTAS AGORA: ${handoff.open.length} (${handoff.inheritedCount} herdada(s), ${handoff.arisenCount} surgida(s) no turno)`,
  );
  if (handoff.open.length === 0) {
    lines.push('  — nenhuma câmera em atenção no momento.');
  } else {
    for (const item of handoff.open) {
      lines.push(
        `  - ${nameOf(item.cameraId)}: ${STATUS_TEXT[item.status]} há ${formatAge(item.ageMs)}` +
          `${item.inherited ? ' (herdada)' : ''}${item.changes > 0 ? ` · ${item.changes} troca(s) de estado` : ''}`,
      );
    }
  }

  lines.push('');
  lines.push('FECHADAS NO TURNO:');
  (Object.keys(REASON_TEXT) as ShiftClosureReason[]).forEach((reason) => {
    const total = handoff.totals[reason];
    lines.push(`  ${REASON_TEXT[reason]}: ${total}`);
    for (const closure of handoff.closed[reason]) {
      lines.push(
        `    - ${nameOf(closure.cameraId)} (pior: ${STATUS_TEXT[closure.worst]}, aberta por ${formatAge(closure.closedAt - closure.openedAt)})`,
      );
    }
  });
  if (handoff.dropped > 0) {
    lines.push(`  (detalhe de ${handoff.dropped} fechamento(s) antigo(s) omitido; contagens acima são completas)`);
  }

  if (handoff.flapping.length > 0) {
    lines.push('');
    lines.push(
      `OSCILAÇÃO (≥${FLAPPING_THRESHOLD} trocas): ${handoff.flapping.map((id) => nameOf(id)).join(', ')}`,
    );
  }

  lines.push('');
  lines.push('Observação: "reconhecida" NÃO significa resolvida.');
  return lines.join('\n');
}
