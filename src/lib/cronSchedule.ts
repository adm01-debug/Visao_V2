/**
 * Wave 33 — Parser mínimo de expressões cron para os padrões usados por
 * `visao-*` (diários, mensais, horários). NÃO é um parser genérico —
 * cobre apenas os casos plausíveis dos jobs internos e retorna:
 *   - nextRun: Date estimada da próxima execução
 *   - freshnessMs: quanto tempo é aceitável entre execuções (2× intervalo)
 *
 * Casos suportados:
 *   "*  *  *  *  *"     → a cada minuto
 *   "M  *  *  *  *"     → uma vez por hora (minuto fixo)
 *   "M  H  *  *  *"     → diário (horário fixo)
 *   "M  H  D  *  *"     → mensal (dia+horário fixos)
 * Qualquer outro padrão retorna null e o card exibe "—".
 */
export interface CronParse {
  nextRun: Date;
  freshnessMs: number;
}

function pad(n: number): number { return n; }

export function parseCronSchedule(expr: string, from: Date = new Date()): CronParse | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minStr, hourStr, domStr, monStr, dowStr] = parts as [string, string, string, string, string];
  if (monStr !== '*' || dowStr !== '*') return null;

  // Caso 1: * * * * *  (a cada minuto)
  if (minStr === '*' && hourStr === '*' && domStr === '*') {
    const n = new Date(from.getTime() + 60_000);
    n.setSeconds(0, 0);
    return { nextRun: n, freshnessMs: 2 * 60_000 };
  }

  const minute = Number.parseInt(minStr, 10);
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;

  // Caso 2: M * * * *  (a cada hora, minuto fixo)
  if (hourStr === '*' && domStr === '*') {
    const n = new Date(from);
    n.setUTCSeconds(0, 0);
    n.setUTCMinutes(minute);
    if (n <= from) n.setUTCHours(n.getUTCHours() + 1);
    return { nextRun: n, freshnessMs: 2 * 60 * 60_000 };
  }

  const hour = Number.parseInt(hourStr, 10);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;

  // Caso 3: M H * * *  (diário)
  if (domStr === '*') {
    const n = new Date(from);
    n.setUTCSeconds(0, 0);
    n.setUTCMinutes(minute);
    n.setUTCHours(hour);
    if (n <= from) n.setUTCDate(n.getUTCDate() + 1);
    return { nextRun: n, freshnessMs: 2 * 24 * 60 * 60_000 };
  }

  // Caso 4: M H D * *  (mensal em dia específico)
  const dom = Number.parseInt(domStr, 10);
  if (!Number.isFinite(dom) || dom < 1 || dom > 31) return null;

  const n = new Date(from);
  n.setUTCSeconds(0, 0);
  n.setUTCMinutes(minute);
  n.setUTCHours(hour);
  n.setUTCDate(pad(dom));
  if (n <= from) n.setUTCMonth(n.getUTCMonth() + 1);
  return { nextRun: n, freshnessMs: 2 * 31 * 24 * 60 * 60_000 };
}

export interface FreshnessStatus {
  status: 'on_time' | 'stale' | 'never';
  nextRunLabel: string;
  ageMs: number | null;
}

export function assessCronFreshness(
  schedule: string,
  lastRun: string | null,
  now: Date = new Date(),
): FreshnessStatus {
  const parsed = parseCronSchedule(schedule, now);
  const nextRunLabel = parsed?.nextRun ? parsed.nextRun.toLocaleString('pt-BR') : '—';

  if (!lastRun) return { status: 'never', nextRunLabel, ageMs: null };
  const age = now.getTime() - new Date(lastRun).getTime();
  if (!parsed) return { status: 'on_time', nextRunLabel, ageMs: age };
  return { status: age > parsed.freshnessMs ? 'stale' : 'on_time', nextRunLabel, ageMs: age };
}
