/**
 * Onda 221 — Editor de agenda semanal do esquema de alarme (lei S8).
 *
 * `normalizeSchedule` (Onda 178) é deliberadamente tolerante: ela descarta
 * período inválido e corta o excedente do sétimo período **em silêncio**,
 * porque roda no caminho de avaliação, onde travar seria pior. No caminho de
 * *cadastro* esse mesmo silêncio é veneno: o operador programaria uma janela,
 * o banco guardaria outra e ninguém saberia até o alarme não tocar.
 *
 * Este módulo é a régua de admissão da agenda. Ela recusa antes de gravar,
 * nomeando o dia e a linha — nunca conserta por conta própria.
 *
 * Leis (G1..G8):
 *
 *  G1. Agenda inteiramente vazia é **24×7 declarado**, não "sem cobertura".
 *      A UI precisa dizer isso em palavras: o operador não pode confundir
 *      "sempre ligado" com "esqueci de configurar".
 *  G2. Teto de 6 períodos por dia (`MAX_PERIODS_PER_DAY`): o sétimo é
 *      **recusado e nomeado**, jamais truncado.
 *  G3. Período degenerado (início igual ao fim) é recusado: seria ambíguo
 *      entre "nada" e "o dia inteiro".
 *  G4. Início maior que fim é **válido** — cruza a meia-noite — e é declarado
 *      como tal na UI, para que ninguém pense ter digitado errado.
 *  G5. Sobreposição no mesmo dia é recusada, inclusive quando um dos períodos
 *      cruza a meia-noite. Janelas sobrepostas não somam cobertura; só
 *      escondem erro de digitação.
 *  G6. Hora malformada ou fora da faixa é recusada nomeando a linha.
 *      `24:00` é aceito **apenas como fim** (o minuto 1440 fecha o dia).
 *  G7. Round-trip fiel: o que é gravado, relido e reexibido é o mesmo — sem
 *      reordenar linhas do operador na ida (a ordenação é do avaliador).
 *  G8. Entrada hostil nunca lança.
 *
 * Puro, determinístico, sem rede e sem relógio.
 */

import {
  MAX_PERIODS_PER_DAY,
  MINUTES_PER_DAY,
  type AlarmSchedule,
  type SchedulePeriod,
} from './alarmAggregation';

export { MAX_PERIODS_PER_DAY };

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export interface SchedulePeriodRow {
  readonly id: string;
  /** Texto do campo `time`: 'HH:MM'. */
  readonly start: string;
  readonly end: string;
}

/** Sete dias, índice 0 = domingo (igual a `Date#getDay`). */
export type ScheduleFormState = readonly (readonly SchedulePeriodRow[])[];

let rowSeq = 0;
export const newPeriodRowId = (): string => `periodo-${++rowSeq}`;

export const emptyScheduleForm = (): ScheduleFormState => [[], [], [], [], [], [], []];

export const newPeriodRow = (start = '08:00', end = '18:00'): SchedulePeriodRow => ({
  id: newPeriodRowId(),
  start,
  end,
});

/* ------------------------------------------------------------------ *
 * Relógio (G6/G8)
 * ------------------------------------------------------------------ */

const CLOCK_RE = /^(\d{1,2}):([0-5]\d)$/;

/** Minuto do dia, ou `null` quando o texto não é uma hora utilizável. */
export function parseClock(raw: unknown, opts: { allowEndOfDay?: boolean } = {}): number | null {
  if (typeof raw !== 'string') return null;
  const match = CLOCK_RE.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || hours > 24) return null;
  const total = hours * 60 + minutes;
  if (total === MINUTES_PER_DAY) return opts.allowEndOfDay === true ? MINUTES_PER_DAY : null;
  if (total > MINUTES_PER_DAY) return null;
  return total;
}

export function formatClock(minute: number): string {
  if (!Number.isFinite(minute)) return '';
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, Math.trunc(minute)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ *
 * Diagnóstico
 * ------------------------------------------------------------------ */

export type ScheduleIssueCode =
  | 'invalid_start'
  | 'invalid_end'
  | 'degenerate_period'
  | 'too_many_periods'
  | 'overlapping_periods';

export interface ScheduleIssue {
  readonly code: ScheduleIssueCode;
  readonly dayIndex: number;
  /** Linhas envolvidas (uma, ou duas em sobreposição). */
  readonly rowIds: readonly string[];
  readonly message: string;
}

export interface ScheduleDiagnosis {
  /** Recusa a gravação (G2/G3/G5/G6). */
  readonly issues: readonly ScheduleIssue[];
  readonly valid: boolean;
  /** G1 — nenhuma linha em nenhum dia. */
  readonly alwaysOn: boolean;
  /** Linhas que cruzam a meia-noite, declaradas (G4). */
  readonly crossMidnightRowIds: readonly string[];
  readonly periodsPerDay: readonly number[];
  readonly totalPeriods: number;
}

type Interval = readonly [number, number];

/** Expande o período em intervalos dentro do dia (cruzar meia-noite vira dois). */
export function expandPeriod(startMin: number, endMin: number): Interval[] {
  if (startMin < endMin) return [[startMin, endMin]];
  return [
    [startMin, MINUTES_PER_DAY],
    [0, endMin],
  ];
}

const intersects = (a: Interval, b: Interval): boolean => a[0] < b[1] && b[0] < a[1];

const asDays = (state: unknown): readonly (readonly SchedulePeriodRow[])[] => {
  const days: (readonly SchedulePeriodRow[])[] = [];
  const src = Array.isArray(state) ? state : [];
  for (let i = 0; i < 7; i += 1) {
    const day = src[i];
    days.push(Array.isArray(day) ? day.filter((r) => r && typeof r === 'object') : []);
  }
  return days;
};

export function diagnoseScheduleForm(state: unknown): ScheduleDiagnosis {
  const days = asDays(state);
  const issues: ScheduleIssue[] = [];
  const crossMidnightRowIds: string[] = [];
  const periodsPerDay: number[] = [];

  days.forEach((rows, dayIndex) => {
    periodsPerDay.push(rows.length);
    const label = WEEKDAY_LABELS[dayIndex];

    // G2 — o excedente é nomeado, nunca cortado.
    if (rows.length > MAX_PERIODS_PER_DAY) {
      issues.push({
        code: 'too_many_periods',
        dayIndex,
        rowIds: rows.slice(MAX_PERIODS_PER_DAY).map((r) => String(r.id ?? '')),
        message: `${label}: máximo de ${MAX_PERIODS_PER_DAY} períodos por dia (${rows.length} informados). Remova os excedentes — eles não seriam gravados.`,
      });
    }

    const resolved: { rowId: string; intervals: Interval[] }[] = [];

    rows.forEach((row) => {
      const rowId = String(row.id ?? '');
      const start = parseClock(row.start);
      const end = parseClock(row.end, { allowEndOfDay: true });

      if (start === null) {
        issues.push({
          code: 'invalid_start',
          dayIndex,
          rowIds: [rowId],
          message: `${label}: hora de início inválida (use HH:MM entre 00:00 e 23:59).`,
        });
        return;
      }
      if (end === null || end === 0) {
        issues.push({
          code: 'invalid_end',
          dayIndex,
          rowIds: [rowId],
          message: `${label}: hora de término inválida (use HH:MM entre 00:01 e 24:00).`,
        });
        return;
      }
      if (start === end) {
        issues.push({
          code: 'degenerate_period',
          dayIndex,
          rowIds: [rowId],
          message: `${label}: início e término iguais (${row.start}). Seria impossível saber se você quis "nada" ou "o dia inteiro".`,
        });
        return;
      }

      if (start > end) crossMidnightRowIds.push(rowId);
      resolved.push({ rowId, intervals: expandPeriod(start, end) });
    });

    // G5 — sobreposição, inclusive atravessando a meia-noite.
    for (let i = 0; i < resolved.length; i += 1) {
      for (let j = i + 1; j < resolved.length; j += 1) {
        const a = resolved[i]!;
        const b = resolved[j]!;
        const hit = a.intervals.some((ia) => b.intervals.some((ib) => intersects(ia, ib)));
        if (hit) {
          issues.push({
            code: 'overlapping_periods',
            dayIndex,
            rowIds: [a.rowId, b.rowId],
            message: `${label}: dois períodos se sobrepõem. Janelas sobrepostas não ampliam cobertura — unifique-as.`,
          });
        }
      }
    }
  });

  const totalPeriods = periodsPerDay.reduce((acc, n) => acc + n, 0);

  return {
    issues,
    valid: issues.length === 0,
    alwaysOn: totalPeriods === 0,
    crossMidnightRowIds,
    periodsPerDay,
    totalPeriods,
  };
}

/* ------------------------------------------------------------------ *
 * Conversões (G7)
 * ------------------------------------------------------------------ */

/**
 * Converte para o formato persistido. Só deve ser chamado com agenda válida —
 * mas, por segurança, uma linha irrecuperável é omitida em vez de virar lixo
 * no JSONB (a recusa já aconteceu antes, no diagnóstico).
 *
 * Devolve `null` para agenda vazia: `null` é o valor que o resto do sistema já
 * lê como 24×7 (G1), e gravar `[[],[],...]` diria a mesma coisa com mais ruído.
 */
export function formToSchedule(state: unknown): AlarmSchedule | null {
  const days = asDays(state);
  const out: SchedulePeriod[][] = [];
  let total = 0;

  for (const rows of days) {
    const periods: SchedulePeriod[] = [];
    for (const row of rows) {
      const startMin = parseClock(row.start);
      const endMin = parseClock(row.end, { allowEndOfDay: true });
      if (startMin === null || endMin === null || endMin === 0 || startMin === endMin) continue;
      periods.push({ startMin, endMin });
    }
    total += periods.length;
    out.push(periods);
  }

  return total === 0 ? null : out;
}

export function scheduleToForm(schedule: AlarmSchedule | null | undefined): ScheduleFormState {
  const out: SchedulePeriodRow[][] = [[], [], [], [], [], [], []];
  if (!Array.isArray(schedule)) return out;
  for (let day = 0; day < 7; day += 1) {
    const periods = schedule[day];
    if (!Array.isArray(periods)) continue;
    for (const period of periods) {
      if (!period || typeof period !== 'object') continue;
      const { startMin, endMin } = period as SchedulePeriod;
      if (!Number.isInteger(startMin) || !Number.isInteger(endMin)) continue;
      if (startMin < 0 || startMin >= MINUTES_PER_DAY) continue;
      if (endMin <= 0 || endMin > MINUTES_PER_DAY) continue;
      if (startMin === endMin) continue;
      out[day]!.push({
        id: newPeriodRowId(),
        start: formatClock(startMin),
        end: formatClock(endMin),
      });
    }
  }
  return out;
}

/** Resumo textual de um dia, para a UI (nunca inventa cobertura). */
export function describeDay(rows: readonly SchedulePeriodRow[] | undefined): string {
  if (!rows || rows.length === 0) return 'Sem janela própria';
  return rows.map((r) => `${r.start}–${r.end}`).join(' · ');
}
