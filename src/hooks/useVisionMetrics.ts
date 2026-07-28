/**
 * Onda 212 — Livro de métricas no ciclo de vida do React.
 *
 * A régua vive em `pipelineMetrics.ts`; este hook só guarda o livro entre
 * renders e publica um retrato estável.
 *
 * DECISÕES
 *  H1 — O livro mora em `useRef`: um ciclo por frame não pode custar um render
 *       por frame. O render acontece quando a *assinatura* do retrato muda
 *       (veredito, latência arredondada, descartes, custo) — nunca por variação
 *       de milissegundo irrelevante.
 *  H2 — `record` é estável: efeitos do chamador não reassinam a cada frame.
 *  H3 — O livro é acumulado por câmera; a janela de auditoria é responsabilidade
 *       do módulo puro (M8), não do React.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CycleReport } from '@/lib/vision/pipelineCycle';
import {
  recordFleetCycle,
  viewFleetMetrics,
  DEFAULT_METRICS_CONFIG,
  type FleetMetricsView,
  type MetricsConfig,
  type MetricsLedger,
} from '@/lib/vision/pipelineMetrics';

export interface UseVisionMetricsResult {
  /** Absorve um relatório de ciclo (Onda 211) no livro. */
  readonly record: (report: CycleReport) => void;
  /** Livro cru — útil para o cartão de auditoria. */
  readonly ledger: MetricsLedger;
  /** Retrato ordenado: pior primeiro. */
  readonly fleet: FleetMetricsView;
  /** Zera o livro (troca de turno, novo período de auditoria). */
  readonly reset: () => void;
}

/** Assinatura barata do retrato — evita render por frame (H1). */
function signature(fleet: FleetMetricsView): string {
  const cameras = fleet.cameras
    .map(
      (camera) =>
        `${camera.cameraId}:${camera.verdict}:${camera.totalDrops}:${camera.cost.unitsSpent}:${
          camera.p95TotalLatencyMs === null ? 'x' : Math.round(camera.p95TotalLatencyMs)
        }`,
    )
    .join(',');
  return `${fleet.verdict}|${fleet.framesSeen}|${cameras}`;
}

export function useVisionMetrics(
  config: MetricsConfig = DEFAULT_METRICS_CONFIG,
): UseVisionMetricsResult {
  const ledgerRef = useRef<MetricsLedger>({});
  const signatureRef = useRef<string>('');
  const [version, bump] = useState(0);
  const configRef = useRef(config);
  configRef.current = config;

  const record = useCallback((report: CycleReport) => {
    ledgerRef.current = recordFleetCycle(ledgerRef.current, report, configRef.current);
    const next = signature(viewFleetMetrics(ledgerRef.current));
    if (next !== signatureRef.current) {
      signatureRef.current = next;
      bump((n) => n + 1);
    }
  }, []);

  const reset = useCallback(() => {
    ledgerRef.current = {};
    signatureRef.current = '';
    bump((n) => n + 1);
  }, []);

  const fleet = useMemo(
    () => viewFleetMetrics(ledgerRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return { record, ledger: ledgerRef.current, fleet, reset };
}
