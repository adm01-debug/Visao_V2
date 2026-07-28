import { describe, expect, it } from 'vitest';
import {
  ANCHOR_KEEP,
  planSnapshotPurge,
  snapshotPlanIsBalanced,
  type SnapshotCandidate,
} from '../reconcileSnapshotRetention';

const DAY = 86_400_000;
const NOW = Date.parse('2026-07-28T12:00:00.000Z');

function rows(...ages: number[]): SnapshotCandidate[] {
  return ages.map((days, i) => ({
    id: i + 1,
    observedAt: NOW - days * DAY,
    verdict: 'reconciled',
  }));
}

describe('reconcileSnapshotRetention (Onda 237)', () => {
  it('N1: relógio ilegível recusa sem apagar', () => {
    const res = planSnapshotPurge(rows(1000), { now: Number.NaN });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.refusal).toBe('bad_now');
  });

  it('N2: prazo fora da faixa recusa o expurgo inteiro', () => {
    expect(planSnapshotPurge(rows(1000), { now: NOW, retentionDays: 30 }).ok).toBe(false);
    expect(planSnapshotPurge(rows(1000), { now: NOW, retentionDays: 4000 }).ok).toBe(false);
    expect(planSnapshotPurge(rows(1000), { now: NOW, retentionDays: 90 }).ok).toBe(true);
  });

  it('N3: empate no corte preserva a foto', () => {
    const res = planSnapshotPurge([{ id: 1, observedAt: NOW - 730 * DAY, verdict: 'reconciled' }], {
      now: NOW,
      retentionDays: 730,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.decisions[0].outcome).toBe('keep');
  });

  it('N4: a âncora sobrevive mesmo quando toda a série está vencida', () => {
    const antigas = rows(...Array.from({ length: 20 }, (_, i) => 1200 - i));
    const res = planSnapshotPurge(antigas, { now: NOW, retentionDays: 730 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.anchored).toBe(ANCHOR_KEEP);
    expect(res.deleted).toBe(20 - ANCHOR_KEEP);
  });

  it('N5: veredito fora do catálogo vai para quarentena, nunca para o lixo', () => {
    const res = planSnapshotPurge(
      [{ id: 1, observedAt: NOW - 2000 * DAY, verdict: 'inventado' }],
      { now: NOW, retentionDays: 730 },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.quarantined).toBe(1);
      expect(res.deleted).toBe(0);
    }
  });

  it('N5: instante ilegível também é quarentena', () => {
    const res = planSnapshotPurge([{ id: 1, observedAt: 'ontem', verdict: 'reconciled' }], {
      now: NOW,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.decisions[0].reason).toBe('unreadable_observed_at');
  });

  it('N6: teto de lote apaga as mais antigas e declara o adiamento', () => {
    const antigas = rows(...Array.from({ length: 15 }, (_, i) => 2000 - i));
    const res = planSnapshotPurge(antigas, { now: NOW, retentionDays: 730, batchCap: 2 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.deleted).toBe(2);
    expect(res.capped).toBe(true);
    expect(res.decisions.filter((d) => d.outcome === 'delete').map((d) => d.id)).toEqual(['1', '2']);
  });

  it('N7: contabilidade sempre fecha', () => {
    const misto: SnapshotCandidate[] = [
      ...rows(1, 100, 900, 1500),
      { id: 90, observedAt: 'nada', verdict: 'reconciled' },
      { id: 91, observedAt: NOW, verdict: 'x' },
    ];
    const res = planSnapshotPurge(misto, { now: NOW, retentionDays: 730, batchCap: 1 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(snapshotPlanIsBalanced(res)).toBe(true);
  });

  it('N8: a ordem da entrada não altera o plano', () => {
    const base = rows(1, 800, 1200, 40, 2000);
    const a = planSnapshotPurge(base, { now: NOW, retentionDays: 730, anchorKeep: 1 });
    const b = planSnapshotPurge([...base].reverse(), {
      now: NOW,
      retentionDays: 730,
      anchorKeep: 1,
    });
    expect(a.ok && b.ok && JSON.stringify(a.decisions) === JSON.stringify(b.decisions)).toBe(true);
  });
});
