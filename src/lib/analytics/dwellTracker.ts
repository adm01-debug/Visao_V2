/**
 * Onda 125 — Analíticos de permanência (dwell) e veículo recorrente.
 *
 * Este módulo é a fonte da verdade em TypeScript das MESMAS regras aplicadas no
 * banco por `public.dwell_policy()` / `public.vehicle_recurrence_policy()` e pelas
 * rotinas `record_dwell_observation`, `evaluate_dwell_alerts` e
 * `evaluate_vehicle_recurrence`. A paridade literal é verificada no CI por
 * `scripts/check-dwell-analytics.mjs`.
 *
 * Por que duplicar a regra: a UI precisa antecipar o veredito (mostrar "faltam
 * 12s para alertar") sem ida ao servidor, e o pipeline de borda precisa decidir
 * offline. Duplicar sem gate seria divergência garantida; com gate, é cache.
 */

/** Política de permanência — espelho de `public.dwell_policy()`. */
export const DWELL_POLICY = {
  /** Sumiço tolerado antes de considerar que a pessoa saiu da zona. */
  gapSeconds: 30,
  /** Permanência mínima para que o fato seja digno de alerta. */
  minDwellSeconds: 60,
  /** Teto duro de uma sessão: acima disso é câmera travada, não pessoa parada. */
  maxOpenSeconds: 21_600,
  /** Detecções mínimas: um único quadro é ruído, não permanência. */
  minDetections: 3,
  /** Confiança mínima da detecção para sequer entrar na conta. */
  minConfidence: 0.45,
  /** Silêncio após alertar, por câmera+zona. */
  alertCooldownSeconds: 900,
} as const;

/** Política de veículo recorrente — espelho de `public.vehicle_recurrence_policy()`. */
export const VEHICLE_RECURRENCE_POLICY = {
  /** Janela deslizante analisada. */
  windowMinutes: 180,
  /** Passagens distintas para caracterizar recorrência. */
  minPasses: 3,
  /** Releituras dentro desse intervalo são a MESMA passagem. */
  samePassSeconds: 120,
  /** Silêncio após alertar a mesma placa. */
  alertCooldownMinutes: 180,
  /** Confiança mínima do OCR de placa. */
  minConfidence: 0.6,
} as const;

export type DwellAction = 'opened' | 'extended' | 'ignored_out_of_order';
export type DwellRejection = 'missing_track_key' | 'low_confidence';

export interface DwellSessionState {
  readonly startedAt: number;
  readonly lastSeenAt: number;
  readonly detections: number;
  readonly peakConfidence: number;
}

export interface DwellObservation {
  readonly trackKey: string;
  readonly confidence: number;
  /** Epoch em milissegundos. */
  readonly observedAt: number;
}

export type DwellDecision =
  | { readonly ok: false; readonly reason: DwellRejection }
  | { readonly ok: true; readonly action: DwellAction; readonly session: DwellSessionState };

/**
 * Aplica uma observação sobre a sessão aberta (se houver), com a mesma histerese
 * do banco: reaparecer dentro de `gapSeconds` continua a sessão; além disso, é
 * outra permanência. Observação fora de ordem nunca encolhe a janela.
 */
export function applyDwellObservation(
  open: DwellSessionState | null,
  observation: DwellObservation
): DwellDecision {
  if (!observation.trackKey || observation.trackKey.trim().length === 0) {
    return { ok: false, reason: 'missing_track_key' };
  }
  if (observation.confidence < DWELL_POLICY.minConfidence) {
    return { ok: false, reason: 'low_confidence' };
  }

  const fresh: DwellSessionState = {
    startedAt: observation.observedAt,
    lastSeenAt: observation.observedAt,
    detections: 1,
    peakConfidence: observation.confidence,
  };

  if (!open) return { ok: true, action: 'opened', session: fresh };

  if (observation.observedAt <= open.lastSeenAt) {
    return { ok: true, action: 'ignored_out_of_order', session: open };
  }

  const gapMs = observation.observedAt - open.lastSeenAt;
  const totalMs = observation.observedAt - open.startedAt;
  const withinGap = gapMs <= DWELL_POLICY.gapSeconds * 1000;
  const withinCeiling = totalMs <= DWELL_POLICY.maxOpenSeconds * 1000;

  if (withinGap && withinCeiling) {
    return {
      ok: true,
      action: 'extended',
      session: {
        startedAt: open.startedAt,
        lastSeenAt: observation.observedAt,
        detections: open.detections + 1,
        peakConfidence: Math.max(open.peakConfidence, observation.confidence),
      },
    };
  }

  return { ok: true, action: 'opened', session: fresh };
}

/** Duração efetiva da permanência, em segundos inteiros. */
export function dwellSeconds(session: DwellSessionState): number {
  return Math.max(0, Math.floor((session.lastSeenAt - session.startedAt) / 1000));
}

/**
 * A sessão já merece alerta? Espelha o filtro de `evaluate_dwell_alerts`:
 * detecções suficientes E duração acima do limite (nunca abaixo do piso).
 */
export function shouldAlertDwell(session: DwellSessionState, thresholdSeconds?: number): boolean {
  const threshold = Math.max(
    thresholdSeconds ?? DWELL_POLICY.minDwellSeconds,
    DWELL_POLICY.minDwellSeconds
  );
  return session.detections >= DWELL_POLICY.minDetections && dwellSeconds(session) >= threshold;
}

/** Segundos que ainda faltam para a sessão virar alerta (0 se já virou). */
export function secondsUntilDwellAlert(
  session: DwellSessionState,
  thresholdSeconds?: number
): number {
  const threshold = Math.max(
    thresholdSeconds ?? DWELL_POLICY.minDwellSeconds,
    DWELL_POLICY.minDwellSeconds
  );
  return Math.max(0, threshold - dwellSeconds(session));
}

export interface PlateRead {
  readonly plate: string;
  readonly confidence: number;
  /** Epoch em milissegundos. */
  readonly seenAt: number;
  readonly cameraId?: string | null;
}

export interface PlateRecurrence {
  readonly plate: string;
  readonly passes: number;
  readonly cameras: number;
  readonly lastSeenAt: number;
  readonly recurrent: boolean;
}

/** Normalização usada nos dois lados: maiúsculas, sem espaços de borda. */
export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase();
}

/**
 * Conta passagens distintas de uma placa na janela, colapsando releituras da
 * mesma passagem. Espelha a CTE `marked` de `evaluate_vehicle_recurrence`.
 */
export function countPlatePasses(
  reads: readonly PlateRead[],
  now: number,
  options?: { readonly windowMinutes?: number; readonly minPasses?: number }
): PlateRecurrence[] {
  const windowMinutes = Math.max(
    options?.windowMinutes ?? VEHICLE_RECURRENCE_POLICY.windowMinutes,
    1
  );
  const minPasses = Math.max(options?.minPasses ?? VEHICLE_RECURRENCE_POLICY.minPasses, 2);
  const floor = now - windowMinutes * 60_000;
  const samePassMs = VEHICLE_RECURRENCE_POLICY.samePassSeconds * 1000;

  const byPlate = new Map<string, PlateRead[]>();
  for (const read of reads) {
    const plate = normalizePlate(read.plate ?? '');
    if (plate.length < 5) continue;
    if (read.confidence < VEHICLE_RECURRENCE_POLICY.minConfidence) continue;
    if (read.seenAt <= floor) continue;
    const bucket = byPlate.get(plate);
    if (bucket) bucket.push(read);
    else byPlate.set(plate, [read]);
  }

  const result: PlateRecurrence[] = [];
  for (const [plate, bucket] of byPlate) {
    const sorted = [...bucket].sort((a, b) => a.seenAt - b.seenAt);
    let passes = 0;
    let previous: number | null = null;
    const cameras = new Set<string>();
    for (const read of sorted) {
      if (previous === null || read.seenAt - previous > samePassMs) passes += 1;
      previous = read.seenAt;
      if (read.cameraId) cameras.add(read.cameraId);
    }
    result.push({
      plate,
      passes,
      cameras: cameras.size,
      // `previous` guarda a última leitura do laço acima; o bucket nunca é vazio.
      lastSeenAt: previous ?? 0,
      recurrent: passes >= minPasses,
    });
  }

  return result.sort((a, b) => b.passes - a.passes || b.lastSeenAt - a.lastSeenAt);
}
