/**
 * Onda 134 — Registro único das rotinas de retenção (expurgo).
 *
 * ## O defeito que esta onda corrige
 *
 * `public.get_retention_overview()` nasceu na Onda 34 cobrindo as duas únicas
 * rotinas de expurgo que existiam (`agent_relay_purge_runs` e
 * `agent_discoveries_purge_runs`). Desde então nasceram outras duas —
 * `collab_notification_purge_runs` (Onda 132) e `collab_entry_purge_runs`
 * (Onda 133) — e nenhuma delas entrou no painel. O banco tinha, na prática,
 * duas rotinas de apagamento de dado pessoal rodando sem qualquer supervisão:
 * se o cron parasse, ninguém veria. A verificação real fez aparecer justamente
 * esse caso — `collab_entry_purge_runs` com ZERO execuções registradas.
 *
 * O segundo defeito é mais sutil: o painel classificava TODAS as rotinas com o
 * mesmo limiar fixo (30h para "atenção", 48h para "parada"). Para uma rotina
 * horária, 30 horas de silêncio significam ~30 execuções perdidas antes do
 * primeiro aviso. O limiar precisa ser derivado da cadência de cada rotina,
 * não de um número mágico global.
 *
 * ## A regra
 *
 * Cada rotina declara sua cadência (`cadenceMinutes`). A partir dela:
 *
 *  - **ok**: silêncio menor que `2 × cadência + tolerância`. Duas janelas de
 *    folga absorvem atraso normal de fila do cron e execuções longas;
 *  - **warn**: até `4 × cadência + tolerância`. Já é anomalia, mas ainda pode
 *    ser recuperação sozinha;
 *  - **stalled**: acima disso, ou nunca executou com a rotina já registrada há
 *    mais de uma janela;
 *  - **never**: nenhuma execução registrada.
 *
 * A tolerância fixa (`GRACE_MINUTES`) existe porque cadências curtas sofrem
 * proporcionalmente mais com o atraso de agendamento: para uma rotina de 1
 * minuto, `2 × cadência` seria estourado por qualquer soluço.
 *
 * Este arquivo é a fonte da verdade espelhada por
 * `public.get_retention_overview()`; a paridade literal é conferida no CI por
 * `scripts/check-retention-registry.mjs`, que TAMBÉM falha quando existe uma
 * tabela `%_purge_runs` no schema `public` que não esteja registrada aqui.
 * Assim, a próxima rotina de expurgo não pode nascer invisível.
 */

/**
 * Situação de uma rotina de expurgo em relação à sua própria cadência.
 *
 * `pending_first_run` (Onda 244) separa dois fatos que antes eram um só:
 * "nunca executou porque acabou de ser registrada" (esperado, sem alerta) e
 * "nunca executou apesar de já ter passado da estreia" (`never`, crítico).
 * Fundir os dois produzia um crítico falso a cada rotina nova — e crítico
 * falso é a forma mais rápida de treinar o operador a ignorar a classe toda.
 */
export type RetentionHealth = 'ok' | 'warn' | 'stalled' | 'pending_first_run' | 'never';

/** Tolerância fixa somada aos múltiplos de cadência, em minutos. */
export const GRACE_MINUTES = 15;

/** Multiplicador de cadência que ainda é considerado saudável. */
export const WARN_CADENCE_FACTOR = 2;

/** Multiplicador de cadência a partir do qual a rotina é dada como parada. */
export const STALLED_CADENCE_FACTOR = 4;

/**
 * Multiplicador da carência de estreia. Uma cadência inteira cobre o pior
 * caso: a rotina é registrada um minuto depois do horário do cron do dia.
 */
export const DEBUT_CADENCE_FACTOR = 1;

/** Uma rotina de expurgo supervisionada. */
export interface RetentionRoutine {
  /** Identificador estável exibido no painel. */
  readonly jobName: string;
  /** Tabela de auditoria que registra cada execução. */
  readonly sourceTable: string;
  /** Intervalo esperado entre execuções, em minutos. */
  readonly cadenceMinutes: number;
  /** Rótulo humano, em português. */
  readonly label: string;
  /**
   * Instante ISO em que a rotina entrou no registro. É a âncora da carência
   * de estreia; sem ela, "nunca executou" volta a ser crítico imediato.
   */
  readonly registeredAt: string;
}

/**
 * Registro das rotinas. Manter em ordem alfabética de `sourceTable` — o gate
 * compara esta lista com o conjunto real de tabelas `%_purge_runs` do banco.
 */
export const RETENTION_ROUTINES: readonly RetentionRoutine[] = [
  {
    jobName: 'admission_ledger',
    sourceTable: 'admission_ledger_purge_runs',
    cadenceMinutes: 1440,
    label: 'Janelas do livro de admissão',
    registeredAt: '2026-07-20T00:00:00.000Z',
  },
  {
    jobName: 'admission_reconcile',
    sourceTable: 'admission_reconcile_purge_runs',
    cadenceMinutes: 1440,
    label: 'Fotos de conciliação da admissão',
    registeredAt: '2026-07-26T00:00:00.000Z',
  },
  {
    jobName: 'agent_discoveries',
    sourceTable: 'agent_discoveries_purge_runs',
    cadenceMinutes: 1440,
    label: 'Descobertas de agentes locais',
    registeredAt: '2026-05-01T00:00:00.000Z',
  },
  {
    jobName: 'agent_relay_tasks',
    sourceTable: 'agent_relay_purge_runs',
    cadenceMinutes: 1440,
    label: 'Tarefas de relay dos agentes',
    registeredAt: '2026-05-01T00:00:00.000Z',
  },
  {
    jobName: 'alarm_recurrence',
    sourceTable: 'alarm_recurrence_purge_runs',
    cadenceMinutes: 1440,
    label: 'Episódios de reincidência de alarme',
    registeredAt: '2026-06-10T00:00:00.000Z',
  },
  {
    jobName: 'collab_entries',
    sourceTable: 'collab_entry_purge_runs',
    cadenceMinutes: 1440,
    label: 'Entradas da rede colaborativa',
    registeredAt: '2026-05-20T00:00:00.000Z',
  },
  {
    jobName: 'collab_notifications',
    sourceTable: 'collab_notification_purge_runs',
    cadenceMinutes: 60,
    label: 'Avisos da rede colaborativa',
    registeredAt: '2026-05-20T00:00:00.000Z',
  },
  {
    jobName: 'dispatch_suppressions',
    sourceTable: 'maintenance_suppression_purge_runs',
    cadenceMinutes: 1440,
    label: 'Trilha de silêncios do despacho',
    registeredAt: '2026-07-29T15:15:00.000Z',
  },
] as const;

/** Busca uma rotina pelo nome; `undefined` quando não registrada. */
export function findRetentionRoutine(jobName: string): RetentionRoutine | undefined {
  return RETENTION_ROUTINES.find((routine) => routine.jobName === jobName);
}

/** Limite de silêncio, em minutos, para cada faixa de saúde. */
export function retentionThresholds(cadenceMinutes: number): {
  readonly warnAfterMinutes: number;
  readonly stalledAfterMinutes: number;
  readonly debutAfterMinutes: number;
} {
  if (!Number.isFinite(cadenceMinutes) || cadenceMinutes <= 0) {
    throw new RangeError(`cadenceMinutes deve ser positivo e finito, recebido: ${cadenceMinutes}`);
  }
  return {
    warnAfterMinutes: WARN_CADENCE_FACTOR * cadenceMinutes + GRACE_MINUTES,
    stalledAfterMinutes: STALLED_CADENCE_FACTOR * cadenceMinutes + GRACE_MINUTES,
    debutAfterMinutes: DEBUT_CADENCE_FACTOR * cadenceMinutes + GRACE_MINUTES,
  };
}

/**
 * Classifica a saúde de uma rotina.
 *
 * Leis da estreia (Onda 244), aplicadas apenas quando NÃO há execução:
 *  - sem idade de registro legível ⇒ `never` (ausência de âncora nunca compra
 *    silêncio);
 *  - idade dentro de `cadência + carência` ⇒ `pending_first_run`;
 *  - idade além disso ⇒ `never`, agora com prova de que nasceu quebrada.
 *
 * Existindo execução, a estreia é irrelevante: a escada de silêncio governa
 * sozinha.
 *
 * @param minutesSinceLastRun minutos desde a última execução; `null` quando
 *   nunca executou. Valores negativos (relógio adiantado do servidor que
 *   gravou a linha) são tratados como zero — silêncio negativo não existe.
 * @param cadenceMinutes cadência declarada da rotina.
 * @param minutesSinceRegistration minutos desde o registro; `null`/omitido
 *   quando não há âncora legível.
 */
export function classifyRetentionHealth(
  minutesSinceLastRun: number | null,
  cadenceMinutes: number,
  minutesSinceRegistration: number | null = null
): RetentionHealth {
  const { warnAfterMinutes, stalledAfterMinutes, debutAfterMinutes } =
    retentionThresholds(cadenceMinutes);

  if (minutesSinceLastRun === null) {
    if (minutesSinceRegistration === null || !Number.isFinite(minutesSinceRegistration)) {
      return 'never';
    }
    const age = Math.max(0, minutesSinceRegistration);
    return age < debutAfterMinutes ? 'pending_first_run' : 'never';
  }

  if (!Number.isFinite(minutesSinceLastRun)) return 'stalled';
  const silence = Math.max(0, minutesSinceLastRun);
  if (silence < warnAfterMinutes) return 'ok';
  if (silence < stalledAfterMinutes) return 'warn';
  return 'stalled';
}

/** `true` quando a situação exige ação humana. */
export function isRetentionActionable(health: RetentionHealth): boolean {
  return health === 'stalled' || health === 'never';
}
