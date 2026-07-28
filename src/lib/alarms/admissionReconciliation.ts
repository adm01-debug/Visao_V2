/**
 * Onda 233 — Conciliação do estoque do livro de admissão contra a trilha de expurgo.
 *
 * ## O defeito que esta onda corrige
 *
 * As Ondas 230–232 confiam na **autodeclaração** da rotina de expurgo: a
 * própria `purge_admission_ledger` escreve quantas linhas apagou e quantas
 * ficaram para trás (`deferred_count`). Toda a supervisão (histórico, fan-in
 * de passivo) lê essa confissão. Se a rotina errar a contagem, pular linhas
 * por um predicado mal escrito, ou for substituída por uma versão futura que
 * declare `deferred = 0` enquanto deixa estoque vencido vivo, **todos os
 * painéis dirão "em dia"** — e as janelas vencidas continuarão no banco.
 *
 * Esta régua deixa de perguntar à rotina e vai olhar o **estoque real**:
 * quantas janelas com `window_end` anterior ao corte ainda existem. Depois
 * confronta esse fato com o passivo declarado. A diferença é o **órfão**: a
 * linha que já venceu, que ninguém apagou e que ninguém assumiu dever.
 *
 * ## Leis (J1–J8)
 *
 *  J1. Inventário ilegível nunca é conciliado: veredito `indeterminate`.
 *      Falta de leitura JAMAIS é prova de estoque limpo.
 *  J2. Inventário anterior à última execução válida é obsoleto — a foto foi
 *      tirada antes da faxina. `indeterminate`, nunca acusação.
 *  J3. Sem execução legível, estoque vencido vivo é `no_run`: o fato existe,
 *      mas a culpa é de silêncio de rotina (fan-in de retenção, Onda 135) e
 *      não de contabilidade mentirosa. Nunca `unaccounted`.
 *  J4. Dívida assumida = passivo declarado + deriva. **Deriva** são as janelas
 *      que venceram DEPOIS da execução (entre o corte da rotina e o corte do
 *      inventário): não podiam ter sido apagadas e não são órfãs. A deriva é
 *      **medida** pelo banco, nunca estimada por relógio.
 *  J5. Estoque vencido acima da dívida assumida é órfão → `unaccounted`,
 *      severidade crítica. É o único veredito que acusa a rotina de mentir.
 *  J6. Estoque vencido abaixo da dívida assumida é `settling`: alguém drenou
 *      entre a execução e a foto. Não é falha — é assunto encerrado.
 *  J7. Quarentena (linha estruturalmente ilegível, que o expurgo nunca apaga
 *      por projeto) é EIXO SEPARADO: nunca vira órfão, nunca some do retrato,
 *      mesmo quando zero.
 *  J8. Todo contador chega possivelmente como texto (`bigint` via PostgREST).
 *      Negativo, fracionário ou não-numérico torna o inventário ilegível (J1).
 *
 * Módulo **puro**: não conhece banco, React nem relógio global. É a fonte da
 * verdade espelhada por `public.admission_reconcile_classify()` e conferida no
 * CI por `scripts/check-admission-reconcile.ts`.
 */

import {
  readCount,
  readInstantStrict,
  type PurgeRunReading,
} from './admissionPurgeHistory.ts';

/** Veredito da conciliação estoque × trilha. */
export type ReconcileVerdict =
  | 'indeterminate'
  | 'no_run'
  | 'reconciled'
  | 'settling'
  | 'unaccounted';

/** Severidade derivada do veredito (nunca informada de fora). */
export type ReconcileSeverity = 'none' | 'warning' | 'critical';

const VERDICT_LABEL: Record<ReconcileVerdict, string> = {
  indeterminate: 'inventário indeterminado',
  no_run: 'estoque vencido sem execução legível',
  reconciled: 'estoque conciliado',
  settling: 'estoque em drenagem',
  unaccounted: 'estoque vencido sem dono',
};

export function reconcileVerdictLabel(verdict: ReconcileVerdict): string {
  return VERDICT_LABEL[verdict];
}

const VERDICT_SEVERITY: Record<ReconcileVerdict, ReconcileSeverity> = {
  indeterminate: 'warning',
  no_run: 'warning',
  reconciled: 'none',
  settling: 'none',
  unaccounted: 'critical',
};

export function reconcileSeverity(verdict: ReconcileVerdict): ReconcileSeverity {
  return VERDICT_SEVERITY[verdict];
}

/** Linha crua do inventário — deliberadamente `unknown` em tudo (J8). */
export interface RawInventoryRow {
  readonly observed_at?: unknown;
  readonly cutoff_at?: unknown;
  readonly retention_days?: unknown;
  readonly expired_stock?: unknown;
  readonly drift_stock?: unknown;
  readonly quarantined_stock?: unknown;
  readonly total_stock?: unknown;
}

/** Inventário depois da leitura desconfiada. */
export interface InventoryReading {
  readonly readable: boolean;
  /** Motivo curto e auditável quando ilegível. */
  readonly reason: string | null;
  readonly observedAt: number | null;
  readonly cutoffAt: number | null;
  readonly retentionDays: number | null;
  readonly expired: number | null;
  readonly drift: number | null;
  readonly quarantined: number | null;
  readonly total: number | null;
}

/** Retrato final apresentado à UI e espelhado no SQL. */
export interface ReconcileSnapshot {
  readonly verdict: ReconcileVerdict;
  readonly label: string;
  readonly severity: ReconcileSeverity;
  /** Motivo curto quando o veredito não é conclusivo. */
  readonly reason: string | null;
  /** Janelas vencidas ainda vivas no estoque (fato observado). */
  readonly expiredStock: number;
  /** Janelas que venceram após a execução — dívida legítima (J4). */
  readonly driftStock: number;
  /** Passivo declarado pela última execução válida. */
  readonly declaredDeferred: number;
  /** Dívida total assumida: passivo + deriva (J4). */
  readonly accountedFor: number;
  /** Excedente sem dono (J5). Zero em qualquer outro veredito. */
  readonly orphanCount: number;
  /** Linhas estruturalmente ilegíveis — eixo separado (J7). */
  readonly quarantinedStock: number;
  /** Tamanho total do livro, para contexto. */
  readonly totalStock: number;
  readonly observedAt: number | null;
  readonly lastRunAt: number | null;
}

/** J1/J8 — lê o inventário sem jamais confiar nele. */
export function readInventory(raw: RawInventoryRow | null | undefined): InventoryReading {
  const base = {
    observedAt: readInstantStrict(raw?.observed_at),
    cutoffAt: readInstantStrict(raw?.cutoff_at),
    retentionDays: readCount(raw?.retention_days),
    expired: readCount(raw?.expired_stock),
    drift: readCount(raw?.drift_stock),
    quarantined: readCount(raw?.quarantined_stock),
    total: readCount(raw?.total_stock),
  } as const;

  if (!raw) return { ...base, readable: false, reason: 'inventario_ausente' };
  if (base.observedAt === null) {
    return { ...base, readable: false, reason: 'inventario_sem_relogio' };
  }
  if (base.cutoffAt === null) {
    return { ...base, readable: false, reason: 'corte_ilegivel' };
  }
  if (base.cutoffAt > base.observedAt) {
    // Corte no futuro da observação é incoerente: apagaria linhas ainda válidas.
    return { ...base, readable: false, reason: 'corte_posterior_a_observacao' };
  }
  if (base.retentionDays === null || base.retentionDays < 1) {
    return { ...base, readable: false, reason: 'prazo_ilegivel' };
  }
  if (
    base.expired === null ||
    base.drift === null ||
    base.quarantined === null ||
    base.total === null
  ) {
    return { ...base, readable: false, reason: 'contador_ilegivel' };
  }
  if (base.expired > base.total || base.quarantined > base.total || base.drift > base.total) {
    // Parte maior que o todo — a consulta de inventário está quebrada.
    return { ...base, readable: false, reason: 'contabilidade_impossivel' };
  }
  return { ...base, readable: true, reason: null };
}

function snapshotOf(
  verdict: ReconcileVerdict,
  inv: InventoryReading,
  lastRun: PurgeRunReading | null,
  extra: { orphanCount: number; declaredDeferred: number; reason: string | null },
): ReconcileSnapshot {
  const drift = inv.drift ?? 0;
  return {
    verdict,
    label: VERDICT_LABEL[verdict],
    severity: VERDICT_SEVERITY[verdict],
    reason: extra.reason,
    expiredStock: inv.expired ?? 0,
    driftStock: drift,
    declaredDeferred: extra.declaredDeferred,
    accountedFor: extra.declaredDeferred + drift,
    orphanCount: extra.orphanCount,
    quarantinedStock: inv.quarantined ?? 0,
    totalStock: inv.total ?? 0,
    observedAt: inv.observedAt,
    lastRunAt: lastRun && lastRun.status === 'valid' ? lastRun.executedAt : null,
  };
}

/**
 * Concilia o estoque observado com a última execução **válida** da rotina.
 *
 * `lastValidRun` deve ser a execução válida mais recente (a leitura da Onda
 * 231 já entrega isso em `snapshot.lastValid`). Linha contestada ou ilegível
 * NUNCA deve ser passada como válida — a função reconfere de todo modo.
 */
export function reconcileAdmissionLedger(
  rawInventory: RawInventoryRow | null | undefined,
  lastValidRun: PurgeRunReading | null,
): ReconcileSnapshot {
  const inv = readInventory(rawInventory);

  // J1 — sem inventário legível não há conciliação possível.
  if (!inv.readable) {
    return snapshotOf('indeterminate', inv, null, {
      orphanCount: 0,
      declaredDeferred: 0,
      reason: inv.reason,
    });
  }

  const run = lastValidRun && lastValidRun.status === 'valid' ? lastValidRun : null;
  const expired = inv.expired ?? 0;

  // J3 — sem execução legível a contabilidade não pode ser acusada.
  if (run === null || run.executedAt === null || run.deferred === null) {
    if (expired === 0) {
      return snapshotOf('reconciled', inv, null, {
        orphanCount: 0,
        declaredDeferred: 0,
        reason: null,
      });
    }
    return snapshotOf('no_run', inv, null, {
      orphanCount: 0,
      declaredDeferred: 0,
      reason: 'sem_execucao_legivel',
    });
  }

  // J2 — foto anterior à faxina não prova nada.
  if (inv.observedAt !== null && inv.observedAt < run.executedAt) {
    return snapshotOf('indeterminate', inv, run, {
      orphanCount: 0,
      declaredDeferred: run.deferred,
      reason: 'inventario_anterior_a_execucao',
    });
  }

  const accounted = run.deferred + (inv.drift ?? 0);

  // J5 — excedente sem dono.
  if (expired > accounted) {
    return snapshotOf('unaccounted', inv, run, {
      orphanCount: expired - accounted,
      declaredDeferred: run.deferred,
      reason: 'estoque_acima_da_divida_assumida',
    });
  }

  // J6 — dívida maior que o estoque: já drenou.
  if (expired < accounted) {
    return snapshotOf('settling', inv, run, {
      orphanCount: 0,
      declaredDeferred: run.deferred,
      reason: null,
    });
  }

  return snapshotOf('reconciled', inv, run, {
    orphanCount: 0,
    declaredDeferred: run.deferred,
    reason: null,
  });
}
