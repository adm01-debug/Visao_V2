/**
 * Onda 245 — Estreia pendente visível no painel de expurgo.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 244 ensinou o **barramento de alertas** a distinguir "nunca executou
 * porque acabou de nascer" de "nunca executou apesar de já ter passado da
 * estreia". O **painel** não aprendeu: `get_retention_overview()` chamava
 * `classify_retention_health` com dois argumentos e devolvia `never` — o
 * rótulo mais grave — para qualquer rotina recém-registrada. O operador via
 * "nunca executou" em vermelho enquanto o sistema, corretamente, não emitia
 * alerta nenhum. Painel e alerta discordando é pior que os dois errados
 * juntos: destrói a confiança nos dois.
 *
 * Além disso o painel só somava 4 das 8 rotinas registradas (as quatro
 * nascidas depois da Onda 134 não tinham origem no `LEFT JOIN`), de modo que
 * rotinas saudáveis apareciam como "nunca executou". Isso foi corrigido no
 * banco na mesma onda.
 *
 * ## As leis (U1–U10)
 *
 *  - **U1** relógio de referência ilegível ⇒ `unknown`. Sem tempo não há
 *    contagem regressiva, e chutar seria inventar prazo.
 *  - **U2** cadência ilegível (não finita ou ≤ 0) ⇒ `unknown`; a carência é
 *    derivada da cadência, então sem cadência não existe estreia.
 *  - **U3** havendo qualquer execução, a estreia é **irrelevante**
 *    (`not_applicable`) — a escada de silêncio governa sozinha.
 *  - **U4** sem âncora de registro legível ⇒ `no_anchor`. Ausência de prova
 *    nunca compra silêncio: o rótulo continua sendo o crítico.
 *  - **U5** registro no futuro é âncora ilegível, não carência infinita.
 *  - **U6** a carência é `cadência + 15 min`, **fechada à esquerda**: no
 *    instante exato do vencimento já é `overdue`.
 *  - **U7** o tempo restante nunca é negativo nem `-0`.
 *  - **U8** o vencimento (`dueAt`) é derivado do **registro**, não do relógio
 *    de leitura: não se move entre renders.
 *  - **U9** a saúde recalculada aqui governa o rótulo exibido; a coluna
 *    `health` vinda do banco é corroboração. Divergência é **declarada**
 *    (`mismatch: true`), nunca silenciada.
 *  - **U10** a contagem regressiva é arredondada **para cima** em minutos
 *    inteiros: enquanto faltar qualquer fração, nunca se exibe "0 min".
 */

import {
  classifyRetentionHealth,
  retentionThresholds,
  type RetentionHealth,
} from './retentionRegistry';

/** Situação da estreia de uma rotina de expurgo. */
export type DebutStage =
  /** Nunca executou e ainda está dentro da carência. */
  | 'pending'
  /** Nunca executou e a carência já venceu — crítico com prova. */
  | 'overdue'
  /** Já executou alguma vez; a estreia não se aplica mais. */
  | 'not_applicable'
  /** Sem âncora de registro legível (nula, ilegível ou no futuro). */
  | 'no_anchor'
  /** Relógio ou cadência ilegíveis: nada pode ser afirmado. */
  | 'unknown';

/** Fatos crus de uma linha do painel, como chegam do banco. */
export interface RetentionDebutInput {
  /** Cadência declarada da rotina, em minutos. */
  readonly cadenceMinutes: number;
  /** Instante ISO da última execução; `null` quando nunca executou. */
  readonly lastRun: string | null;
  /** Instante ISO do registro da rotina; `null` quando sem âncora. */
  readonly registeredAt: string | null;
  /** Saúde calculada pelo banco, para conferência (U9). */
  readonly reportedHealth?: string | null;
}

/** Veredito de estreia de uma rotina. */
export interface RetentionDebutView {
  readonly stage: DebutStage;
  /** Saúde recalculada localmente a partir dos fatos crus. */
  readonly health: RetentionHealth;
  /** Minutos inteiros restantes até o vencimento; `null` fora de `pending`. */
  readonly minutesRemaining: number | null;
  /** Instante ISO em que a carência vence; `null` sem âncora legível. */
  readonly dueAt: string | null;
  /** `true` quando a saúde do banco discorda da recalculada (U9). */
  readonly mismatch: boolean;
}

const MS_PER_MINUTE = 60_000;

/** Converte ISO em epoch ms; `null` quando ilegível. */
function parseInstant(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Avalia a estreia de uma rotina de expurgo.
 *
 * @param row fatos crus da linha do painel.
 * @param nowMs relógio de referência em epoch ms.
 */
export function evaluateRetentionDebut(
  row: RetentionDebutInput,
  nowMs: number
): RetentionDebutView {
  const reported = typeof row.reportedHealth === 'string' ? row.reportedHealth : null;

  // U1/U2 — sem relógio ou sem cadência, nada é afirmável.
  if (!Number.isFinite(nowMs)) {
    return {
      stage: 'unknown',
      health: 'never',
      minutesRemaining: null,
      dueAt: null,
      mismatch: false,
    };
  }
  if (!Number.isFinite(row.cadenceMinutes) || row.cadenceMinutes <= 0) {
    return {
      stage: 'unknown',
      health: 'never',
      minutesRemaining: null,
      dueAt: null,
      mismatch: false,
    };
  }

  const { debutAfterMinutes } = retentionThresholds(row.cadenceMinutes);
  const registeredMs = parseInstant(row.registeredAt);
  // U8 — vencimento ancorado no registro, imune ao relógio de leitura.
  const dueAt =
    registeredMs === null
      ? null
      : new Date(registeredMs + debutAfterMinutes * MS_PER_MINUTE).toISOString();

  const lastRunMs = parseInstant(row.lastRun);
  const minutesSinceLastRun = lastRunMs === null ? null : (nowMs - lastRunMs) / MS_PER_MINUTE;

  // U4/U5 — âncora ausente, ilegível ou no futuro não conta como carência.
  const anchorUsable = registeredMs !== null && registeredMs <= nowMs;
  const minutesSinceRegistration = anchorUsable
    ? (nowMs - (registeredMs as number)) / MS_PER_MINUTE
    : null;

  const health = classifyRetentionHealth(
    minutesSinceLastRun,
    row.cadenceMinutes,
    minutesSinceRegistration
  );
  const mismatch = reported !== null && reported !== health;

  // U3 — houve execução: a estreia deixou de existir.
  if (minutesSinceLastRun !== null) {
    return { stage: 'not_applicable', health, minutesRemaining: null, dueAt, mismatch };
  }

  if (minutesSinceRegistration === null) {
    // O vencimento continua sendo exibível quando o carimbo é legível (ainda
    // que no futuro): esconder o número apagaria a prova do relógio errado.
    return { stage: 'no_anchor', health, minutesRemaining: null, dueAt, mismatch };
  }

  const remaining = debutAfterMinutes - minutesSinceRegistration;
  // U6 — fronteira fechada à esquerda: zero já venceu.
  if (remaining <= 0) {
    return { stage: 'overdue', health, minutesRemaining: null, dueAt, mismatch };
  }

  // U7/U10 — nunca negativo, sempre arredondado para cima.
  return {
    stage: 'pending',
    health,
    minutesRemaining: Math.max(1, Math.ceil(remaining)),
    dueAt,
    mismatch,
  };
}

/** Rótulo humano curto da contagem regressiva (`null` fora de `pending`). */
export function formatDebutCountdown(view: RetentionDebutView): string | null {
  if (view.stage !== 'pending' || view.minutesRemaining === null) return null;
  const minutes = view.minutesRemaining;
  if (minutes < 60) return `estreia em ${minutes} min`;
  const hours = minutes / 60;
  if (hours < 48) return `estreia em ${hours.toFixed(1)} h`;
  return `estreia em ${Math.floor(hours / 24)} d`;
}
