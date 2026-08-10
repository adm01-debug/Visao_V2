import { describe, expect, it } from 'vitest';
import {
  OTHER_BUCKET,
  assessCoverage,
  buildAdmissionLedger,
  ledgerIsBalanced,
  mergeAdmissionLedgers,
  type LedgerEntry,
} from '../admissionLedger';

const BASE = Date.UTC(2026, 6, 27, 12, 0, 0);
const e = (
  sourceId: string,
  reason: LedgerEntry['verdict']['reason'],
  at: number | null = BASE
): LedgerEntry => ({ sourceId, at, verdict: { reason } });

describe('buildAdmissionLedger', () => {
  it('L1 — contabilidade fechada', () => {
    const l = buildAdmissionLedger([
      e('cam-1', 'admitted'),
      e('cam-1', 'out_of_window'),
      e('cam-2', 'no_scheme'),
    ]);
    expect(l.total).toBe(3);
    expect(l.admitted).toBe(1);
    expect(ledgerIsBalanced(l)).toBe(true);
  });

  it('L2 — cada evento conta uma vez, pelo motivo global', () => {
    const l = buildAdmissionLedger([e('cam-1', 'admitted_degraded')]);
    expect(l.counts.admitted).toBe(0);
    expect(l.counts.admitted_degraded).toBe(1);
    expect(l.admitted).toBe(1);
  });

  it('L3 — evento fora da janela é descartado de forma declarada', () => {
    const l = buildAdmissionLedger([e('cam-1', 'admitted', BASE - 1)], { windowStartAt: BASE });
    expect(l.total).toBe(0);
    expect(l.droppedOutOfWindow).toBe(1);
  });

  it('L3 — evento sem data nunca é descartado pela janela', () => {
    const l = buildAdmissionLedger([e('cam-1', 'indeterminate', null)], { windowStartAt: BASE });
    expect(l.total).toBe(1);
    expect(l.droppedOutOfWindow).toBe(0);
  });

  it('L4 — evento sem relógio não move as bordas', () => {
    const l = buildAdmissionLedger([e('cam-1', 'admitted', null)]);
    expect(l.bySource[0].firstAt).toBeNull();
    expect(l.bySource[0].lastAt).toBeNull();
  });

  it('L5 — a ordem de chegada não altera o livro', () => {
    const entries = [e('cam-2', 'disabled', BASE + 60), e('cam-1', 'admitted', BASE)];
    expect(buildAdmissionLedger(entries)).toEqual(buildAdmissionLedger([...entries].reverse()));
  });

  it('L8 — excedente de cardinalidade vai para um balde visível', () => {
    const l = buildAdmissionLedger(
      [e('cam-1', 'admitted'), e('cam-2', 'admitted'), e('cam-3', 'admitted')],
      { maxSources: 2 }
    );
    const other = l.bySource.find((s) => s.sourceId === OTHER_BUCKET);
    expect(other?.total).toBe(1);
    expect(l.bySource[l.bySource.length - 1].sourceId).toBe(OTHER_BUCKET);
  });

  it('motivo desconhecido é ignorado em vez de corromper o livro', () => {
    const l = buildAdmissionLedger([
      { sourceId: 'cam-1', at: BASE, verdict: { reason: 'inventado' as never } },
    ]);
    expect(l.total).toBe(0);
    expect(ledgerIsBalanced(l)).toBe(true);
  });
});

describe('assessCoverage', () => {
  it('L6 — origem do inventário sem evento é "sem dado", nunca coberta', () => {
    const c = assessCoverage(buildAdmissionLedger([]), ['cam-9']);
    expect(c).toEqual([
      { sourceId: 'cam-9', status: 'no_data', dominantReason: null, total: 0, admitted: 0 },
    ]);
  });

  it('L6 — uma única admissão já cobre a origem', () => {
    const l = buildAdmissionLedger([e('cam-1', 'out_of_window'), e('cam-1', 'admitted')]);
    expect(assessCoverage(l)[0].status).toBe('covered');
  });

  it('L6 — sem admissão é lacuna com motivo dominante', () => {
    const l = buildAdmissionLedger([
      e('cam-1', 'no_scheme'),
      e('cam-1', 'no_scheme'),
      e('cam-1', 'source_missing'),
    ]);
    const [c] = assessCoverage(l);
    expect(c.status).toBe('gap');
    expect(c.dominantReason).toBe('no_scheme');
  });
});

describe('mergeAdmissionLedgers', () => {
  it('L7 — fundir partes reproduz o todo', () => {
    const all = [
      e('cam-1', 'admitted'),
      e('cam-2', 'disabled', BASE + 10),
      e('cam-1', 'no_scheme'),
    ];
    const whole = buildAdmissionLedger(all);
    const merged = mergeAdmissionLedgers([
      buildAdmissionLedger(all.slice(0, 1)),
      buildAdmissionLedger(all.slice(1)),
    ]);
    expect(merged.counts).toEqual(whole.counts);
    expect(merged.total).toBe(whole.total);
    expect(merged.bySource.map((s) => [s.sourceId, s.total, s.firstAt, s.lastAt])).toEqual(
      whole.bySource.map((s) => [s.sourceId, s.total, s.firstAt, s.lastAt])
    );
  });

  it('L7 — fusão vazia é neutra', () => {
    const m = mergeAdmissionLedgers([]);
    expect(m.total).toBe(0);
    expect(ledgerIsBalanced(m)).toBe(true);
  });

  it('L7 — a janela resultante é a mais recente entre as partes', () => {
    const m = mergeAdmissionLedgers([
      buildAdmissionLedger([], { windowStartAt: BASE }),
      buildAdmissionLedger([], { windowStartAt: BASE + 5000 }),
    ]);
    expect(m.windowStartAt).toBe(BASE + 5000);
  });
});
