/**
 * VISÃO — gate de máscaras de movimento (`motion_masks`).
 *
 * A regra include/exclude é definida por `public.point_triggers_motion()` no banco e
 * continua sendo a única fonte de verdade. Aqui só decidimos quando chamá-la e o que
 * fazer quando ela falha:
 *   - câmera sem máscara habilitada → nenhuma detecção é descartada (1 SELECT indexado);
 *   - erro de leitura ou de RPC → mantém a detecção e sinaliza degradação (fail-open,
 *     para que uma máscara mal configurada nunca esconda um evento real).
 *
 * As dependências são injetadas para permitir teste unitário sem rede/Supabase.
 */

export interface MotionMaskBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MotionMaskDeps {
  /** Quantidade de máscaras habilitadas da câmera (0 ⇒ pipeline segue como antes). */
  countEnabledMasks(): Promise<{ count: number | null; error?: string | null }>;
  /** Avalia um ponto normalizado (0..1) contra as máscaras via `point_triggers_motion`. */
  pointTriggersMotion(
    x: number,
    y: number
  ): Promise<{ value: boolean | null; error?: string | null }>;
  warn(message: string, data?: Record<string, unknown>): void;
}

export interface MotionMaskGateResult<T> {
  kept: T[];
  removed: number;
  degraded: boolean;
}

/** Centro do bbox em coordenadas normalizadas; `null` quando o bbox é inutilizável. */
export function bboxCenter(bbox?: MotionMaskBox | null): { x: number; y: number } | null {
  if (!bbox) return null;
  const { x, y, width, height } = bbox;
  const nums = [x, y, width, height];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return { x: x + width / 2, y: y + height / 2 };
}

export async function applyMotionMaskGate<T extends { bbox?: MotionMaskBox | null }>(
  deps: MotionMaskDeps,
  detections: T[]
): Promise<MotionMaskGateResult<T>> {
  if (detections.length === 0) return { kept: [], removed: 0, degraded: false };

  const probe = await deps.countEnabledMasks();
  if (probe.error) {
    deps.warn('motion_masks lookup failed', { err: probe.error });
    return { kept: detections, removed: 0, degraded: true };
  }
  if (!probe.count) return { kept: detections, removed: 0, degraded: false };

  const kept: T[] = [];
  let removed = 0;
  let degraded = false;

  for (const det of detections) {
    const center = bboxCenter(det.bbox);
    if (!center) {
      // Sem bbox não há como aplicar a máscara: preservar é o comportamento seguro.
      kept.push(det);
      continue;
    }
    const triggered = await deps.pointTriggersMotion(center.x, center.y);
    if (triggered.error || triggered.value === null) {
      deps.warn('point_triggers_motion failed', {
        err: triggered.error ?? 'resposta nao booleana',
      });
      degraded = true;
      kept.push(det);
      continue;
    }
    if (triggered.value) kept.push(det);
    else removed += 1;
  }

  return { kept, removed, degraded };
}
