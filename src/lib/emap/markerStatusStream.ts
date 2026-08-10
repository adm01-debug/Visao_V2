import type { MapMarkerStatus, MapPlacement } from '@/lib/emap/floorPlanGeometry';

/**
 * Onda 162 — reconciliação do estado das câmeras no mapa de situação.
 *
 * A Onda 161 desenhou o mapa, mas ele só contava a verdade do instante em que
 * a página carregou. Ligar o tempo real ingenuamente (`setState` a cada evento)
 * cria três defeitos difíceis de enxergar:
 *
 *   1. **Evento atrasado rebaixa alarme.** O canal de tempo real não garante
 *      ordem. Um `online` emitido às 10:00 pode chegar DEPOIS do `alert` de
 *      10:01 e apagar o alarme na tela de quem está de plantão.
 *   2. **Empate de relógio decide no azar.** Dois eventos com o mesmo carimbo
 *      resolvidos por "quem chegou por último" fazem a tela piscar entre dois
 *      estados a cada reconexão.
 *   3. **Estado desconhecido virar "tudo bem".** Um valor novo vindo do banco
 *      (ou nulo) traduzido para `online` é a pior falha possível num mapa de
 *      segurança: ele afirma cobertura que ninguém conferiu.
 *
 * Este módulo é a regra única dessas três decisões. É puro: sem rede, sem
 * relógio próprio, sem React — o carimbo de tempo SEMPRE vem de fora, para que
 * a simulação possa exercitar chegada fora de ordem de forma determinística.
 */

/** Severidade decrescente. O mapa sempre prefere o pior estado num empate. */
const SEVERITY: readonly MapMarkerStatus[] = ['alert', 'offline', 'warning', 'unknown', 'online'];

const severityRank = (status: MapMarkerStatus): number => {
  const index = SEVERITY.indexOf(status);
  return index === -1 ? SEVERITY.indexOf('unknown') : index;
};

/**
 * Traduz o valor bruto vindo do banco para o vocabulário do mapa.
 *
 * Qualquer valor fora do conjunto conhecido (nulo, string nova de uma migração
 * futura, lixo) vira `unknown`. Nunca `online`.
 */
export function toMarkerStatus(raw: unknown): MapMarkerStatus {
  switch (raw) {
    case 'online':
      return 'online';
    case 'offline':
      return 'offline';
    case 'alert':
      return 'alert';
    case 'warning':
      return 'warning';
    default:
      return 'unknown';
  }
}

export interface StatusEvent {
  cameraId: string;
  /** Valor bruto do banco — a tradução é feita aqui, nunca no componente. */
  status: unknown;
  /** Carimbo de tempo em milissegundos, vindo da linha alterada. */
  observedAt: number;
}

export interface LedgerEntry {
  status: MapMarkerStatus;
  observedAt: number;
}

/** Estado conhecido por câmera. Chave = `cameraId`. */
export type StatusLedger = Readonly<Record<string, LedgerEntry>>;

export type ApplyOutcome =
  /** Evento aceito e o estado mudou. */
  | 'applied'
  /** Evento aceito, mas o estado já era esse (nada a redesenhar). */
  | 'unchanged'
  /** Evento antigo demais: chegou depois de um mais recente. Descartado. */
  | 'stale'
  /** Empate de relógio resolvido pelo pior estado, que já estava no livro. */
  | 'tie_kept_worst'
  /** Evento malformado (sem câmera ou sem carimbo válido). Descartado. */
  | 'invalid';

export interface ApplyResult {
  ledger: StatusLedger;
  outcome: ApplyOutcome;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Aplica um evento ao livro de estados.
 *
 * Invariantes garantidas (verificadas por simulação):
 *   - Reaplicar o mesmo evento nunca muda o resultado (idempotência).
 *   - A ordem de chegada não altera o estado final de um mesmo conjunto de
 *     eventos (comutatividade), porque o desempate é por severidade máxima e
 *     não por ordem.
 *   - Um evento com carimbo mais antigo JAMAIS sobrescreve um mais recente.
 *   - O livro nunca cria uma entrada a partir de evento inválido.
 */
export function applyStatusEvent(ledger: StatusLedger, event: StatusEvent): ApplyResult {
  if (typeof event?.cameraId !== 'string' || event.cameraId.length === 0) {
    return { ledger, outcome: 'invalid' };
  }
  if (!isFiniteNumber(event.observedAt)) {
    return { ledger, outcome: 'invalid' };
  }

  const incoming = toMarkerStatus(event.status);
  const current = ledger[event.cameraId];

  if (!current) {
    return {
      ledger: { ...ledger, [event.cameraId]: { status: incoming, observedAt: event.observedAt } },
      outcome: 'applied',
    };
  }

  if (event.observedAt < current.observedAt) {
    return { ledger, outcome: 'stale' };
  }

  if (event.observedAt === current.observedAt) {
    if (incoming === current.status) return { ledger, outcome: 'unchanged' };
    // Empate de relógio: fica o pior. Rebaixar alarme por sorteio de ordem de
    // chegada é exatamente o defeito que este módulo existe para impedir.
    if (severityRank(incoming) >= severityRank(current.status)) {
      return { ledger, outcome: 'tie_kept_worst' };
    }
    return {
      ledger: { ...ledger, [event.cameraId]: { status: incoming, observedAt: event.observedAt } },
      outcome: 'applied',
    };
  }

  if (incoming === current.status) {
    // Carimbo avança mesmo sem mudança visual: é o que impede que um evento
    // intermediário atrasado reabra um estado já superado.
    return {
      ledger: { ...ledger, [event.cameraId]: { status: incoming, observedAt: event.observedAt } },
      outcome: 'unchanged',
    };
  }

  return {
    ledger: { ...ledger, [event.cameraId]: { status: incoming, observedAt: event.observedAt } },
    outcome: 'applied',
  };
}

export function applyStatusEvents(
  ledger: StatusLedger,
  events: readonly StatusEvent[]
): StatusLedger {
  return events.reduce<StatusLedger>(
    (accumulated, event) => applyStatusEvent(accumulated, event).ledger,
    ledger
  );
}

/** Constrói o livro inicial a partir da carga completa das câmeras. */
export function ledgerFromSnapshot(
  rows: readonly { id: string; status: unknown; observedAt?: number }[],
  fallbackObservedAt: number
): StatusLedger {
  return applyStatusEvents(
    {},
    rows.map((row) => ({
      cameraId: row.id,
      status: row.status,
      observedAt: isFiniteNumber(row.observedAt) ? row.observedAt : fallbackObservedAt,
    }))
  );
}

/**
 * Projeta o livro sobre os marcadores da planta.
 *
 * Câmera sem entrada no livro fica `unknown` — não herda o estado anterior nem
 * assume `online`. A lista de marcadores é preservada em quantidade e ordem:
 * tempo real nunca pode fazer um ponto sumir do mapa.
 */
export function reconcilePlacements(
  placements: readonly MapPlacement[],
  ledger: StatusLedger
): MapPlacement[] {
  return placements.map((placement) => {
    const entry = ledger[placement.cameraId];
    const status: MapMarkerStatus = entry ? entry.status : 'unknown';
    return status === placement.status ? placement : { ...placement, status };
  });
}

export interface StatusTransition {
  cameraId: string;
  from: MapMarkerStatus;
  to: MapMarkerStatus;
  /** Verdadeiro quando o estado piorou — é o que merece aviso sonoro/toast. */
  worsened: boolean;
}

/** Diferença entre dois livros, para avisar o operador só do que piorou. */
export function diffLedgers(previous: StatusLedger, next: StatusLedger): StatusTransition[] {
  const transitions: StatusTransition[] = [];
  for (const cameraId of Object.keys(next).sort()) {
    const entry = next[cameraId];
    if (!entry) continue;
    const to = entry.status;
    const from = previous[cameraId]?.status ?? 'unknown';
    if (from === to) continue;
    transitions.push({ cameraId, from, to, worsened: severityRank(to) < severityRank(from) });
  }
  return transitions;
}
