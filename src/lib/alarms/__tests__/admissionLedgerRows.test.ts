/**
 * Onda 229 — Testes da leitura desconfiada do livro persistido (R1–R7).
 */

import { describe, expect, it } from 'vitest';
import {
  ledgerFromRows,
  summarizeCoverage,
  type AdmissionWindowRow,
} from '../admissionLedgerRows';

const T0 = Date.parse('2026-07-28T00:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

const row = (over: Partial<AdmissionWindowRow> = {}): AdmissionWindowRow => ({
  source_id: 'cam-1',
  window_start: iso(T0),
  window_end: iso(T0 + 3_600_000),
  counts: { admitted: 2, disabled: 1 },
  total: 3,
  admitted: 2,
  dropped_out_of_window: 0,
  first_at: iso(T0 + 1000),
  last_at: iso(T0 + 2000),
  ...over,
});

describe('ledgerFromRows', () => {
  it('R1 — aceita linha fechada e soma corretamente', () => {
    const r = ledgerFromRows([row(), row({ source_id: 'cam-2' })]);
    expect(r.accepted).toBe(2);
    expect(r.ledger.total).toBe(6);
    expect(r.ledger.admitted).toBe(4);
    expect(r.malformed).toHaveLength(0);
  });

  it('R1 — quarentena linha desbalanceada em vez de sanear', () => {
    const r = ledgerFromRows([row({ total: 10 })]);
    expect(r.accepted).toBe(0);
    expect(r.malformed[0].reason).toBe('unbalanced');
    expect(r.ledger.total).toBe(0);
  });

  it('R2 — motivo desconhecido invalida a linha', () => {
    const r = ledgerFromRows([row({ counts: { admitted: 2, disabled: 1, alien: 0 } })]);
    expect(r.malformed[0].reason).toBe('unknown_reason');
  });

  it('R3 — linha anterior ao corte é contada como fora do recorte', () => {
    const r = ledgerFromRows([row()], { windowStartAt: T0 + 7_200_000 });
    expect(r.outOfRange).toBe(1);
    expect(r.accepted).toBe(0);
  });

  it('R4 — data ilegível não impede a contabilização, mas não data', () => {
    const r = ledgerFromRows([row({ first_at: 'xx', last_at: 'yy' })]);
    expect(r.accepted).toBe(1);
    expect(r.ledger.bySource[0].firstAt).toBeNull();
  });

  it('R5 — origem só vista corrompida nunca é coberta', () => {
    const r = ledgerFromRows([row({ source_id: 'cam-9', total: 99 })]);
    expect(r.unreadableSources).toEqual(['cam-9']);
    const s = summarizeCoverage(r, []);
    expect(s.verdicts[0]).toMatchObject({ sourceId: 'cam-9', status: 'no_data' });
  });

  it('R6 — a ordem das linhas não altera totais', () => {
    const rows = [row(), row({ source_id: 'cam-2', total: 3 }), row({ source_id: 'cam-3' })];
    const a = ledgerFromRows(rows);
    const b = ledgerFromRows([...rows].reverse());
    expect(b.ledger.total).toBe(a.ledger.total);
    expect(b.malformed).toEqual(a.malformed);
  });

  it('R7 — origem em branco é lixo estrutural', () => {
    const r = ledgerFromRows([row({ source_id: '   ' })]);
    expect(r.malformed[0].reason).toBe('blank_source');
  });
});

describe('summarizeCoverage', () => {
  it('origem esperada sem evento é no_data (nunca coberta)', () => {
    const s = summarizeCoverage(ledgerFromRows([]), ['cam-silenciosa']);
    expect(s).toMatchObject({ covered: 0, gap: 0, noData: 1 });
  });

  it('origem com eventos e nenhuma admissão vira buraco com motivo', () => {
    const r = ledgerFromRows([row({ counts: { disabled: 4 }, total: 4, admitted: 0 })]);
    const s = summarizeCoverage(r, ['cam-1']);
    expect(s.gap).toBe(1);
    expect(s.verdicts[0].dominantReason).toBe('disabled');
  });
});
