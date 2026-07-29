/**
 * Onda 244 — Carência de estreia das rotinas de retenção.
 *
 * ## O defeito que este módulo corrige
 *
 * `evaluate_retention_alerts` (Onda 135) percorre o registro de retenção
 * (Onda 134) e classifica cada rotina pelo silêncio desde a última execução.
 * Quando `max(executed_at) IS NULL` o veredito era `never` — **crítico
 * imediato**.
 *
 * Isso é correto para uma rotina antiga que parou de rodar e perdeu a trilha.
 * É **falso** para uma rotina que acabou de ser registrada: entre o `CREATE`
 * e a primeira execução do cron existe uma janela legítima de até uma cadência
 * inteira em que "nunca executou" é o estado esperado, não uma falha.
 *
 * A Onda 243 provou o defeito na prática: a rotina `dispatch_suppressions` foi
 * registrada com cadência diária e cron às 03:37; qualquer avaliação horária
 * antes da estreia dispararia um crítico dizendo que a rotina "nunca
 * executou". Um crítico falso é pior que nenhum alerta — ele treina o operador
 * a ignorar a classe inteira, e é exatamente esse ruído que as Ondas 240–242
 * passaram a combater no despacho.
 *
 * A correção NÃO é dar carência a quem nunca rodou (isso esconderia rotina
 * natimorta para sempre). É ancorar a carência num fato declarado: o instante
 * de registro. Passado `registered_at + cadence + grace` sem nenhuma execução,
 * a rotina volta a ser crítica — inclusive mais grave, porque agora existe
 * prova de que ela nasceu quebrada.
 *
 * Régua PURA: não conhece banco, relógio global nem React.
 *
 * ## Leis U1–U9
 *
 *  U1. Relógio ilegível não classifica nada: veredito `unknown`, nunca `ok`.
 *  U2. Cadência ilegível (ausente, ≤ 0, não finita) é `unknown` — extrapolar
 *      cadência seria inventar o prazo que define a própria falha.
 *  U3. Rotina COM execução legível ignora completamente a estreia; a escada de
 *      silêncio (2×/4× + carência) governa sozinha.
 *  U4. Rotina SEM execução e SEM `registered_at` legível é `never` (crítico) —
 *      ausência de âncora nunca compra silêncio.
 *  U5. Rotina SEM execução, dentro de `registered_at + cadence + grace`, é
 *      `pending_first_run`: informativa, sem alerta.
 *  U6. Passado esse prazo sem execução, é `never_ran` (crítico) e o texto cita
 *      há quanto tempo ela foi registrada.
 *  U7. `registered_at` no futuro é ilegível (U4), nunca carência infinita.
 *  U8. Execução com instante no futuro não conta como execução (cai em U4/U5):
 *      relógio adiantado não prova trabalho feito.
 *  U9. Determinismo total: mesmas entradas ⇒ mesmo veredito e mesma severidade.
 */

/** Carência fixa somada a toda janela, espelhando `retention_health_thresholds`. */
export const RETENTION_GRACE_MINUTES = 15;
/** Fator de atraso (aviso) da escada de silêncio. */
export const RETENTION_WARN_FACTOR = 2;
/** Fator de parada (crítico) da escada de silêncio. */
export const RETENTION_STALLED_FACTOR = 4;

export type RetentionHealth =
  | 'ok'
  | 'late'
  | 'stalled'
  | 'pending_first_run'
  | 'never_ran'
  | 'unknown';

export type RetentionSeverity = 'none' | 'warning' | 'critical' | 'unknown';

export interface RetentionRoutineInput {
  readonly jobName?: unknown;
  readonly cadenceMinutes?: unknown;
  /** Instante da última execução conhecida (ms epoch) ou nulo se nunca rodou. */
  readonly lastRunAt?: unknown;
  /** Instante em que a rotina entrou no registro (ms epoch). */
  readonly registeredAt?: unknown;
}

export interface RetentionRoutineVerdict {
  readonly jobName: string;
  readonly health: RetentionHealth;
  readonly severity: RetentionSeverity;
  /** Minutos desde a última execução; `null` quando nunca executou. */
  readonly silenceMinutes: number | null;
  /** Minutos desde o registro; `null` quando o registro é ilegível. */
  readonly ageMinutes: number | null;
  /** Minutos restantes de carência de estreia; `0` fora dela. */
  readonly debutRemainingMinutes: number;
  readonly reason: string;
}

const MIN = 60_000;

function finiteInstant(value: unknown, now: number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > now ? null : value; // U7/U8: futuro é ilegível.
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed > now ? null : parsed;
  }
  return null;
}

function positiveCadence(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function severityForRetentionHealth(health: RetentionHealth): RetentionSeverity {
  switch (health) {
    case 'ok':
    case 'pending_first_run':
      return 'none';
    case 'late':
      return 'warning';
    case 'stalled':
    case 'never_ran':
      return 'critical';
    default:
      return 'unknown';
  }
}

/**
 * Classifica uma rotina de retenção considerando a carência de estreia.
 *
 * @param input  linha crua do registro + trilha (tudo `unknown` de propósito).
 * @param now    relógio do avaliador em ms epoch.
 */
export function classifyRetentionRoutine(
  input: RetentionRoutineInput,
  now: number,
): RetentionRoutineVerdict {
  const jobName =
    typeof input.jobName === 'string' && input.jobName.trim().length > 0
      ? input.jobName.trim()
      : '(desconhecida)';

  const base = {
    jobName,
    silenceMinutes: null,
    ageMinutes: null,
    debutRemainingMinutes: 0,
  } as const;

  // U1 — relógio ilegível.
  if (!Number.isFinite(now)) {
    return { ...base, health: 'unknown', severity: 'unknown', reason: 'relógio do avaliador ilegível' };
  }

  // U2 — cadência ilegível.
  const cadence = positiveCadence(input.cadenceMinutes);
  if (cadence === null) {
    return {
      ...base,
      health: 'unknown',
      severity: 'unknown',
      reason: `${jobName}: cadência declarada ilegível — impossível julgar pontualidade`,
    };
  }

  const registeredAt = finiteInstant(input.registeredAt, now);
  const ageMinutes = registeredAt === null ? null : Math.max(0, (now - registeredAt) / MIN);
  const lastRunAt = finiteInstant(input.lastRunAt, now);

  // U3 — existe execução legível: a escada de silêncio governa sozinha.
  if (lastRunAt !== null) {
    const silence = Math.max(0, (now - lastRunAt) / MIN);
    const warnAfter = RETENTION_WARN_FACTOR * cadence + RETENTION_GRACE_MINUTES;
    const stalledAfter = RETENTION_STALLED_FACTOR * cadence + RETENTION_GRACE_MINUTES;
    const health: RetentionHealth =
      silence < warnAfter ? 'ok' : silence < stalledAfter ? 'late' : 'stalled';
    return {
      jobName,
      health,
      severity: severityForRetentionHealth(health),
      silenceMinutes: silence,
      ageMinutes,
      debutRemainingMinutes: 0,
      reason:
        health === 'ok'
          ? `${jobName}: última execução há ${Math.round(silence)} min (cadência ${cadence} min)`
          : `${jobName}: sem expurgo há ${Math.round(silence)} min (cadência ${cadence} min)`,
    };
  }

  // U4 — nunca executou e não há âncora legível.
  if (registeredAt === null) {
    return {
      ...base,
      health: 'never_ran',
      severity: 'critical',
      reason: `${jobName}: rotina de expurgo nunca executou e não há data de registro para justificar`,
    };
  }

  const debutDeadline = registeredAt + (cadence + RETENTION_GRACE_MINUTES) * MIN;

  // U5 — dentro da carência de estreia.
  if (now < debutDeadline) {
    return {
      jobName,
      health: 'pending_first_run',
      severity: 'none',
      silenceMinutes: null,
      ageMinutes,
      debutRemainingMinutes: Math.max(0, (debutDeadline - now) / MIN),
      reason: `${jobName}: registrada há ${Math.round(ageMinutes ?? 0)} min, aguardando a primeira execução (cadência ${cadence} min)`,
    };
  }

  // U6 — estreia perdida: nasceu quebrada.
  return {
    jobName,
    health: 'never_ran',
    severity: 'critical',
    silenceMinutes: null,
    ageMinutes,
    debutRemainingMinutes: 0,
    reason: `${jobName}: registrada há ${Math.round(ageMinutes ?? 0)} min e nunca executou (cadência ${cadence} min)`,
  };
}

/** Pior severidade primeiro; a ordem é estável por nome (U9). */
const SEVERITY_RANK: Record<RetentionSeverity, number> = {
  critical: 0,
  warning: 1,
  unknown: 2,
  none: 3,
};

export interface RetentionFleetVerdict {
  readonly routines: readonly RetentionRoutineVerdict[];
  readonly critical: number;
  readonly warning: number;
  readonly pendingDebut: number;
  readonly unknown: number;
  readonly worst: RetentionSeverity;
}

export function classifyRetentionFleet(
  inputs: readonly RetentionRoutineInput[],
  now: number,
): RetentionFleetVerdict {
  const routines = inputs
    .map((i) => classifyRetentionRoutine(i, now))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        a.jobName.localeCompare(b.jobName),
    );

  const count = (s: RetentionSeverity) => routines.filter((r) => r.severity === s).length;
  const critical = count('critical');
  const warning = count('warning');
  const unknown = count('unknown');

  return {
    routines,
    critical,
    warning,
    unknown,
    pendingDebut: routines.filter((r) => r.health === 'pending_first_run').length,
    worst:
      critical > 0 ? 'critical' : warning > 0 ? 'warning' : unknown > 0 ? 'unknown' : 'none',
  };
}
