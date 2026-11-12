/**
 * Timeout por fase = sweep_ms * 1.5, com piso de 4s e teto de 20s.
 * Fallback (sweep desconhecido): 12s.
 */
export function computePhaseTimeout(sweepMs?: number | null): number {
  const MIN = 4_000;
  const MAX = 20_000;
  const FALLBACK = 12_000;
  if (!sweepMs || !Number.isFinite(sweepMs) || sweepMs <= 0) return FALLBACK;
  return Math.min(MAX, Math.max(MIN, Math.round(sweepMs * 1.5)));
}
