/**
 * Regras puras da calibração PTZ.
 *
 * Extraídas de `PtzCalibrationPanel` para permitir testes unitários
 * sem montar a árvore React. Mantêm a mesma semântica utilizada no
 * componente: qualquer alteração aqui deve ser refletida lá.
 */

export type PtzAxis = 'pan' | 'tilt' | 'zoom';

export interface ValidationEntry {
  /** Erro percentual absoluto observado na revalidação. */
  error_pct: number;
}

export type ValidationMap = Partial<Record<PtzAxis, ValidationEntry>>;

/** Limiar (%) acima do qual a recaptura de min/max se torna obrigatória. */
export const RECAPTURE_THRESHOLD_PCT = 10;

/**
 * Determina, por eixo, se a recaptura guiada é obrigatória.
 * Um eixo exige recaptura quando existe uma entrada de validação
 * cujo `error_pct` é **estritamente maior** que o limiar.
 */
export function computeRecaptureRequired(
  validation: ValidationMap,
  threshold: number = RECAPTURE_THRESHOLD_PCT,
): Record<PtzAxis, boolean> {
  const pick = (a: PtzAxis): boolean => {
    const v = validation[a];
    return !!v && v.error_pct > threshold;
  };
  return { pan: pick('pan'), tilt: pick('tilt'), zoom: pick('zoom') };
}

/** Retorna `true` se **qualquer** eixo demandar recaptura. */
export function hasAnyRecaptureRequired(
  required: Record<PtzAxis, boolean>,
): boolean {
  return required.pan || required.tilt || required.zoom;
}

export type ObservedRangeError =
  | 'not_finite'
  | 'out_of_bounds'
  | 'min_ge_max';

export interface ObservedRangeResult {
  ok: boolean;
  error?: ObservedRangeError;
}

/**
 * Valida um range observado (min/max) contra os limites físicos do eixo.
 *
 * Regras (na ordem de curto-circuito):
 *  1. `min` e `max` devem ser números finitos.
 *  2. Ambos devem estar dentro de `[lo, hi]` (inclusivos).
 *  3. `min` deve ser **estritamente menor** que `max` (min ≥ max é inválido).
 */
export function validateObservedRange(
  min: number,
  max: number,
  bounds: readonly [number, number],
): ObservedRangeResult {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ok: false, error: 'not_finite' };
  }
  const [lo, hi] = bounds;
  if (min < lo || max > hi) {
    return { ok: false, error: 'out_of_bounds' };
  }
  if (min >= max) {
    return { ok: false, error: 'min_ge_max' };
  }
  return { ok: true };
}
