/**
 * Onda 176 — escalonamento do prazo vencido ("quem mais precisa saber disto?").
 *
 * A Onda 174 diz se o atendimento está atrasado; a 175 mede o desempenho do
 * turno. Falta o eixo que transforma atraso em **responsabilidade compartilhada**:
 * um alarme vencido há 30 segundos é problema do operador; vencido há uma hora
 * é problema da supervisão. Sem esse eixo, o atraso morre dentro do painel.
 *
 * Regras invioláveis (cada uma existe porque a alternativa mente sobre o turno):
 *
 *  1. **Só o vencido EM ABERTO escalona.** `met`/`late` são vereditos
 *     congelados por ciência (174, regra 3): a pendência já foi vista por um
 *     humano. Escalonar depois da ciência puniria quem atendeu.
 *  2. **O degrau vem do atraso relativo, não do absoluto.** Comparar 2 minutos
 *     de atraso num alarme (orçamento 2min) com 2 minutos num `unknown`
 *     (orçamento 15min) trataria o leve como grave. O múltiplo `overdue/budget`
 *     é a única medida justa entre gravidades diferentes.
 *  3. **O degrau nunca retrocede dentro da mesma janela.** Melhora de estado
 *     encolhe o orçamento cobrado? Não importa: quem já foi acionado não é
 *     "desacionado". Rebaixar apagaria a prova de que a supervisão foi chamada.
 *  4. **Janela nova zera a memória.** `openedAt` diferente é outro fato; herdar
 *     o degrau anterior acusaria o turno atual por dívida antiga.
 *  5. **Cada degrau avisa uma vez.** A transição é emitida só na subida; um
 *     relógio de 1s não pode gerar um chamado por segundo.
 *  6. **Relógio para trás nunca cria degrau.** Herdado da 174: sem atraso
 *     medido, sem escalonamento. Preferimos subestimar a acusar por NTP torto.
 *  7. **Puro e imutável.** Sem `Date.now()`, sem rede, sem mutação da memória
 *     recebida — a memória de entrada é sempre devolvida como cópia nova.
 */

import type { SlaVerdict } from './triageSla';

/** Degraus de acionamento, do menor para o maior. */
export type EscalationLevel = 'none' | 'operator' | 'supervisor' | 'management';

export const ESCALATION_ORDER: readonly EscalationLevel[] = [
  'none',
  'operator',
  'supervisor',
  'management',
] as const;

export const escalationRank = (level: EscalationLevel): number => {
  const index = ESCALATION_ORDER.indexOf(level);
  return index < 0 ? 0 : index;
};

export interface EscalationPolicy {
  /**
   * Múltiplos do orçamento (regra 2) que abrem cada degrau. Devem ser
   * crescentes; valores inválidos caem no padrão.
   */
  readonly supervisorAtRatio: number;
  readonly managementAtRatio: number;
}

export const DEFAULT_ESCALATION_POLICY: EscalationPolicy = {
  supervisorAtRatio: 1,
  managementAtRatio: 3,
};

/** Registro durável por câmera — a prova de que o degrau foi alcançado. */
export interface EscalationRecord {
  cameraId: string;
  /** Janela de atenção a que este degrau pertence (regra 4). */
  openedAt: number;
  /** Maior degrau já alcançado nesta janela (regra 3). */
  level: EscalationLevel;
  /** Instante em que o degrau atual foi alcançado. */
  at: number;
}

export type EscalationLedger = Readonly<Record<string, EscalationRecord>>;

/** Subida de degrau — o que merece um aviso (regra 5). */
export interface EscalationTransition {
  cameraId: string;
  openedAt: number;
  from: EscalationLevel;
  to: EscalationLevel;
  at: number;
  /** Atraso acumulado no instante da subida, em ms. */
  overdueMs: number;
}

const isClock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizePolicy = (policy?: EscalationPolicy): EscalationPolicy => {
  const supervisor =
    policy && isClock(policy.supervisorAtRatio) && policy.supervisorAtRatio > 0
      ? policy.supervisorAtRatio
      : DEFAULT_ESCALATION_POLICY.supervisorAtRatio;
  const management =
    policy && isClock(policy.managementAtRatio) && policy.managementAtRatio > supervisor
      ? policy.managementAtRatio
      : Math.max(DEFAULT_ESCALATION_POLICY.managementAtRatio, supervisor + 1);
  return { supervisorAtRatio: supervisor, managementAtRatio: management };
};

/**
 * Degrau instantâneo devido por um veredito de prazo — sem memória.
 *
 * Nunca lança: veredito inconsistente vira `none`, jamais um chamado inventado.
 */
export function escalationLevelFor(
  verdict: SlaVerdict | null | undefined,
  policy?: EscalationPolicy
): EscalationLevel {
  if (!verdict || verdict.state !== 'breached' || verdict.frozen) return 'none';
  const budgetMs = verdict.budgetMs;
  const overdueMs = verdict.overdueMs;
  if (!isClock(budgetMs) || budgetMs <= 0) return 'none';
  if (!isClock(overdueMs) || overdueMs <= 0) return 'none';

  const { supervisorAtRatio, managementAtRatio } = normalizePolicy(policy);
  const ratio = overdueMs / budgetMs;
  if (ratio >= managementAtRatio) return 'management';
  if (ratio >= supervisorAtRatio) return 'supervisor';
  return 'operator';
}

export interface ReconcileEscalationsInput {
  verdicts: Iterable<SlaVerdict>;
  /** Memória anterior; nunca é mutada (regra 7). */
  memory?: EscalationLedger | null;
  now: number;
  policy?: EscalationPolicy;
}

export interface ReconcileEscalationsResult {
  memory: EscalationLedger;
  /** Somente subidas (regra 5), ordenadas por gravidade e depois por câmera. */
  transitions: EscalationTransition[];
}

/**
 * Reconcilia o livro de escalonamento com os vereditos de prazo atuais.
 *
 * Determinístico: a mesma entrada devolve exatamente a mesma saída, o que
 * permite persistir a memória entre recargas sem gerar chamados duplicados.
 */
export function reconcileEscalations(input: ReconcileEscalationsInput): ReconcileEscalationsResult {
  const now = isClock(input.now) ? input.now : 0;
  const policy = normalizePolicy(input.policy);
  const previous = input.memory ?? {};
  const memory: Record<string, EscalationRecord> = {};
  const transitions: EscalationTransition[] = [];
  const seen = new Set<string>();

  for (const verdict of input.verdicts ?? []) {
    if (!verdict || typeof verdict.cameraId !== 'string' || verdict.cameraId.length === 0) {
      continue;
    }
    const cameraId = verdict.cameraId;
    if (seen.has(cameraId)) continue;
    seen.add(cameraId);

    const openedAt = isClock(verdict.startedAt) ? verdict.startedAt : 0;
    const prior = previous[cameraId];
    // Regra 4: registro de outra janela é inerte, não herdado.
    const carried =
      prior && prior.openedAt === openedAt && typeof prior.level === 'string' ? prior : null;

    const due = escalationLevelFor(verdict, policy);
    const carriedLevel: EscalationLevel = carried ? carried.level : 'none';

    // Regra 3: o degrau é o máximo entre o devido agora e o já alcançado.
    const level = escalationRank(due) > escalationRank(carriedLevel) ? due : carriedLevel;

    if (level === 'none') {
      // Nada a registrar: livro não guarda "ausência de escalonamento".
      continue;
    }

    const rose = escalationRank(level) > escalationRank(carriedLevel);
    memory[cameraId] = {
      cameraId,
      openedAt,
      level,
      at: rose ? now : (carried?.at ?? now),
    };

    if (rose) {
      transitions.push({
        cameraId,
        openedAt,
        from: carriedLevel,
        to: level,
        at: now,
        overdueMs: isClock(verdict.overdueMs) ? verdict.overdueMs : 0,
      });
    }
  }

  transitions.sort(
    (a, b) => escalationRank(b.to) - escalationRank(a.to) || a.cameraId.localeCompare(b.cameraId)
  );

  return { memory, transitions };
}

export interface EscalationSummary {
  /** Quantidade de câmeras em cada degrau (exceto `none`). */
  byLevel: Record<Exclude<EscalationLevel, 'none'>, number>;
  /** Maior degrau vigente. */
  highest: EscalationLevel;
  /** Total de pendências escaladas. */
  total: number;
}

export function summarizeEscalations(
  ledger: EscalationLedger | null | undefined
): EscalationSummary {
  const byLevel = { operator: 0, supervisor: 0, management: 0 };
  let highest: EscalationLevel = 'none';
  let total = 0;

  for (const record of Object.values(ledger ?? {})) {
    if (!record || record.level === 'none' || !(record.level in byLevel)) continue;
    byLevel[record.level as Exclude<EscalationLevel, 'none'>] += 1;
    total += 1;
    if (escalationRank(record.level) > escalationRank(highest)) highest = record.level;
  }

  return { byLevel, highest, total };
}

const LEVEL_LABEL: Record<EscalationLevel, string> = {
  none: 'sem acionamento',
  operator: 'operador',
  supervisor: 'supervisão',
  management: 'gerência',
};

export const escalationLabel = (level: EscalationLevel): string =>
  LEVEL_LABEL[level] ?? LEVEL_LABEL.none;
