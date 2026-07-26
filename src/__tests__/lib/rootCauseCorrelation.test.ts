import { describe, expect, it } from 'vitest';
import {
  correlateRootCause,
  summarizeRootCause,
  EMPTY_BUCKETS,
  DEFAULT_ROOT_CAUSE_THRESHOLDS,
  type SkewFindingLike,
} from '@/lib/rootCauseCorrelation';

const NOW = Date.UTC(2026, 6, 26, 3, 0, 0);
const HOUR = 3_600_000;
const PARENT = 'plate_detections';

function finding(overrides: Partial<SkewFindingLike> = {}): SkewFindingLike {
  return {
    cameraId: 'cam-a',
    cameraName: 'Portaria',
    sourceTable: PARENT,
    severity: 'critical',
    direction: 'behind',
    sampleCount: 100,
    medianSkewSeconds: -90_000,
    sentinelRows: 800,
    detectedAtMs: NOW - HOUR,
    suppressed: false,
    ...overrides,
  };
}

function growth(overrides: Partial<Parameters<typeof correlateRootCause>[0]['growth'][number]> = {}) {
  return {
    parent: PARENT,
    currentRows: 10_000,
    rowsAddedInWindow: 1_000,
    windowHours: 24,
    buckets: { ...EMPTY_BUCKETS, pre2000: 500 },
    ...overrides,
  };
}

describe('correlateRootCause', () => {
  it('declara estabilidade quando o backlog não cresce de forma relevante', () => {
    const [c] = correlateRootCause({
      nowMs: NOW,
      growth: [growth({ rowsAddedInWindow: DEFAULT_ROOT_CAUSE_THRESHOLDS.minRowsAdded - 1 })],
      skewFindings: [finding()],
    });
    expect(c?.verdict).toBe('no_backlog');
    expect(c?.culprits).toHaveLength(0);
  });

  it('trata janela degenerada como dados insuficientes, não como saúde', () => {
    const [c] = correlateRootCause({
      nowMs: NOW,
      growth: [growth({ windowHours: 0 })],
      skewFindings: [finding()],
    });
    expect(c?.verdict).toBe('insufficient_data');
  });

  it('atribui o crescimento à câmera com relógio crítico e assinatura coerente', () => {
    const [c] = correlateRootCause({
      nowMs: NOW,
      growth: [growth({ rowsAddedInWindow: 1_000 })],
      skewFindings: [finding({ sentinelRows: 900 })],
    });
    expect(c?.verdict).toBe('attributed');
    expect(c?.culprits[0]?.cameraId).toBe('cam-a');
    expect(c?.culprits[0]?.confidence).toBe('high');
    expect(c?.attributedRatio).toBeCloseTo(0.9, 5);
    expect(c?.unexplainedRatio).toBeCloseTo(0.1, 5);
  });

  it('nunca imputa mais do que o backlog cresceu', () => {
    const [c] = correlateRootCause({
      nowMs: NOW,
      growth: [growth({ rowsAddedInWindow: 100 })],
      skewFindings: [finding({ sentinelRows: 1_000_000 })],
    });
    expect(c?.attributedRatio).toBeLessThanOrEqual(1);
    expect(c?.culprits[0]?.estimatedRows).toBeLessThanOrEqual(100);
  });

  it('marca como inexplicado quando nenhuma câmera candidata existe', () => {
    const [c] = correlateRootCause({
      nowMs: NOW,
      growth: [growth({ rowsAddedInWindow: 50_000 })],
      skewFindings: [],
    });
    expect(c?.verdict).toBe('unexplained');
    expect(c?.unexplainedRatio).toBe(1);
  });

  it('ignora câmeras silenciadas, saudáveis ou de outra tabela', () => {
    const [c] = correlateRootCause({
      nowMs: NOW,
      growth: [growth({ rowsAddedInWindow: 10_000 })],
      skewFindings: [
        finding({ cameraId: 'cam-sup', suppressed: true }),
        finding({ cameraId: 'cam-ok', severity: 'ok' }),
        finding({ cameraId: 'cam-outra', sourceTable: 'recognition_logs' }),
      ],
    });
    expect(c?.culprits).toHaveLength(0);
    expect(c?.verdict).toBe('unexplained');
  });

  it('rebaixa a confiança quando o achado de relógio está desatualizado', () => {
    const fresh = correlateRootCause({
      nowMs: NOW,
      growth: [growth()],
      skewFindings: [finding()],
    })[0]?.culprits[0];
    const stale = correlateRootCause({
      nowMs: NOW,
      growth: [growth()],
      skewFindings: [finding({ detectedAtMs: NOW - 400 * HOUR })],
    })[0]?.culprits[0];

    expect(fresh?.confidence).toBe('high');
    expect(stale?.confidence).toBe('medium');
    // A idade afeta só a confiança, jamais o rateio.
    expect(stale?.contributionRatio).toBeCloseTo(fresh?.contributionRatio ?? -1, 10);
  });

  it('rateia proporcionalmente entre múltiplas câmeras, em ordem decrescente', () => {
    const [c] = correlateRootCause({
      nowMs: NOW,
      growth: [growth({ rowsAddedInWindow: 10_000 })],
      skewFindings: [
        finding({ cameraId: 'cam-a', sentinelRows: 3_000 }),
        finding({ cameraId: 'cam-b', sentinelRows: 1_000 }),
      ],
    });
    expect(c?.culprits.map((x) => x.cameraId)).toEqual(['cam-a', 'cam-b']);
    expect(c?.culprits[0]?.contributionRatio).toBeGreaterThan(c?.culprits[1]?.contributionRatio ?? 1);
    expect(c?.attributedRatio).toBeCloseTo(0.4, 5);
  });

  it('produz veredito parcial quando sobra crescimento sem dono', () => {
    const [c] = correlateRootCause({
      nowMs: NOW,
      growth: [growth({ rowsAddedInWindow: 10_000 })],
      skewFindings: [finding({ sentinelRows: 5_000 })],
    });
    expect(c?.verdict).toBe('partial');
    expect(c?.recommendation).toContain('sem causa identificada');
  });

  it('ordena os vereditos priorizando o inexplicado', () => {
    const result = correlateRootCause({
      nowMs: NOW,
      growth: [
        growth({ parent: 'explicado', rowsAddedInWindow: 1_000 }),
        growth({ parent: 'recognition_logs', rowsAddedInWindow: 90_000 }),
      ],
      skewFindings: [finding({ sourceTable: 'explicado', sentinelRows: 1_000 })],
    });
    expect(result[0]?.parent).toBe('recognition_logs');
    expect(result[0]?.verdict).toBe('unexplained');
  });
});

describe('summarizeRootCause', () => {
  it('escala para crítico quando existe backlog sem dono', () => {
    const summary = summarizeRootCause(
      correlateRootCause({
        nowMs: NOW,
        growth: [growth({ rowsAddedInWindow: 90_000 })],
        skewFindings: [],
      }),
    );
    expect(summary.severity).toBe('critical');
  });

  it('fica em aviso quando tudo tem dono conhecido', () => {
    const summary = summarizeRootCause(
      correlateRootCause({
        nowMs: NOW,
        growth: [growth({ rowsAddedInWindow: 1_000 })],
        skewFindings: [finding({ sentinelRows: 950 })],
      }),
    );
    expect(summary.severity).toBe('warning');
  });

  it('reporta ok quando não há crescimento relevante', () => {
    const summary = summarizeRootCause(
      correlateRootCause({ nowMs: NOW, growth: [growth({ rowsAddedInWindow: 0 })], skewFindings: [] }),
    );
    expect(summary.severity).toBe('ok');
  });
});
