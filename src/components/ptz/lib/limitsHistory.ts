/**
 * Helpers puros para o versionamento e rollback de `limits` PTZ.
 * Sem dependência de React ou Supabase — testável isoladamente.
 */

import type { PtzLimits } from '../PtzCalibrationPanel';

export interface LimitsHistoryItem {
  limits: PtzLimits;
  saved_at: string; // ISO
  source: 'wizard' | 'manual' | 'rollback' | string;
}

/**
 * Prepend `item` ao histórico e corta em `cap` itens.
 * Se o item mais recente já tem o mesmo `saved_at`, ignora (dedup).
 */
export function pushHistory(
  prev: LimitsHistoryItem[],
  item: LimitsHistoryItem,
  cap = 10
): LimitsHistoryItem[] {
  const head = prev[0];
  if (head && head.saved_at === item.saved_at) return prev;
  return [item, ...prev].slice(0, Math.max(1, cap));
}

/** Compara dois PtzLimits por igualdade estrutural rasa. */
export function limitsEqual(a: PtzLimits, b: PtzLimits): boolean {
  for (const axis of ['pan', 'tilt', 'zoom'] as const) {
    if (a[axis].min !== b[axis].min || a[axis].max !== b[axis].max) return false;
  }
  return true;
}

/** Formata um item para o dropdown de rollback. */
export function formatHistorySummary(item: LimitsHistoryItem): string {
  const fmt = (n: number) => n.toFixed(2);
  const { pan, tilt, zoom } = item.limits;
  return `pan ${fmt(pan.min)}→${fmt(pan.max)} · tilt ${fmt(tilt.min)}→${fmt(tilt.max)} · zoom ${fmt(zoom.min)}→${fmt(zoom.max)}`;
}
