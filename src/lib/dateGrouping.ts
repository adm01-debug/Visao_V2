/**
 * Agrupamento de timestamps por dia local.
 *
 * O bug original usava `.startsWith(dayStr)` sobre o timestamp ISO UTC,
 * atribuindo eventos próximos à meia-noite ao dia errado em fusos negativos
 * (ex.: UTC-03:00). `sameLocalDay` converte para o fuso local antes de comparar.
 */
import { format } from 'date-fns';

export function sameLocalDay(iso: string | null | undefined, dayStr: string): boolean {
  if (!iso) return false;
  return format(new Date(iso), 'yyyy-MM-dd') === dayStr;
}
