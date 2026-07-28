import { describe, expect, it } from 'vitest';
import {
  PURGE_CADENCE_MINUTES,
  purgeHealthLabel,
  purgeHealthSeverity,
  readCount,
  readPurgeHistory,
  readPurgeRun,
} from '../admissionPurgeHistory';

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const MIN = 60_000;

function row(over: Record<string, unknown> = {}) {
  return {
    id: 'run-1',
    executed_at: new Date(NOW - 60 * MIN).toISOString(),
    cutoff_at: new Date(NOW - 400 * 86_400_000).toISOString(),
    retention_days: 365,
    batch_cap: 50_000,
    deleted_count: 10,
    deferred_count: 0,
    quarantined_count: 0,
    capped: false,
    duration_ms: 12,
    ...over,
  };
}

describe('readCount', () => {
  it('aceita bigint textual do PostgREST', () => {
    expect(readCount('42')).toBe(42);
  });
  it('recusa texto não numérico e negativos', () => {
    expect(readCount('42a')).toBeNull();
    expect(readCount(-1)).toBeNull();
    expect(readCount(1.5)).toBeNull();
  });
});

describe('readPurgeRun', () => {
  it('lê linha íntegra', () => {
    expect(readPurgeRun(row()).status).toBe('valid');
  });
  it('contesta espelho de teto divergente', () => {
    const r = readPurgeRun(row({ capped: true, deferred_count: 0 }));
    expect(r.status).toBe('inconsistent');
    expect(r.reason).toBe('espelho_de_teto_divergente');
  });
  it('marca ilegível quando falta relógio', () => {
    expect(readPurgeRun(row({ executed_at: null })).status).toBe('unreadable');
  });
  it('contesta apagadas acima do teto', () => {
    expect(readPurgeRun(row({ batch_cap: 5, deleted_count: 6 })).status).toBe('inconsistent');
  });
});

describe('readPurgeHistory', () => {
  it('histórico vazio nunca é em dia', () => {
    const s = readPurgeHistory([], { now: NOW });
    expect(s.health).toBe('never_ran');
    expect(s.hoursSinceLast).toBeNull();
  });

  it('só linhas sujas é contestado, nunca "nunca executou"', () => {
    const s = readPurgeHistory([row({ executed_at: 'xx' })], { now: NOW });
    expect(s.health).toBe('contested');
  });

  it('rotina pontual e limpa é em dia', () => {
    expect(readPurgeHistory([row()], { now: NOW }).health).toBe('ok');
  });

  it('passivo é eixo separado da pontualidade', () => {
    const s = readPurgeHistory([row({ deferred_count: 10, capped: true })], { now: NOW });
    expect(s.health).toBe('backlog');
    expect(s.deferredNow).toBe(10);
  });

  it('passivo crescente agrava', () => {
    const rows = [
      row({ id: 'c', executed_at: new Date(NOW - 10 * MIN).toISOString(), deferred_count: 30, capped: true }),
      row({ id: 'b', executed_at: new Date(NOW - 1500 * MIN).toISOString(), deferred_count: 20, capped: true }),
      row({ id: 'a', executed_at: new Date(NOW - 3000 * MIN).toISOString(), deferred_count: 10, capped: true }),
    ];
    expect(readPurgeHistory(rows, { now: NOW }).health).toBe('backlog_growing');
  });

  it('atraso e parada seguem a cadência', () => {
    const late = row({ executed_at: new Date(NOW - PURGE_CADENCE_MINUTES * 3 * MIN).toISOString() });
    const stalled = row({ executed_at: new Date(NOW - PURGE_CADENCE_MINUTES * 9 * MIN).toISOString() });
    expect(readPurgeHistory([late], { now: NOW }).health).toBe('late');
    expect(readPurgeHistory([stalled], { now: NOW }).health).toBe('stalled');
  });

  it('relógio ilegível é indeterminado, nunca em dia', () => {
    expect(readPurgeHistory([row()], { now: Number.NaN }).health).toBe('unknown');
  });

  it('rotula e ordena severidade', () => {
    expect(purgeHealthLabel('stalled')).toBe('parada');
    expect(purgeHealthSeverity('stalled')).toBeGreaterThan(purgeHealthSeverity('ok'));
  });
});
