/**
 * Onda 148 — testes do filtro por responsável.
 * Espelham as invariantes varridas por `npm run sim:wave148`.
 */
import { describe, expect, it } from 'vitest';
import {
  applyOwnerFilter,
  buildOwnerBuckets,
  resolveOwnerFilter,
  type OwnerFilterKey,
} from '@/lib/maintenance/ownerFilter';
import {
  buildMaintenanceConsole,
  type MaintenanceAlertRow,
} from '@/lib/maintenance/maintenanceConsoleView';

const NOW = Date.parse('2026-07-27T12:00:00Z');

function row(
  id: string,
  owner: string | null,
  severity: 'critical' | 'warning',
  acknowledged: boolean
): MaintenanceAlertRow {
  return {
    id,
    routine: `routine-${id}`,
    severity,
    reason: 'motivo',
    detail: owner === null ? null : { owner, scope: 'camera', cameras: 1 },
    created_at: new Date(NOW - 30 * 60_000).toISOString(),
    observed_at: null,
    acknowledged_at: acknowledged ? new Date(NOW - 60_000).toISOString() : null,
    acknowledged_by: acknowledged ? 'admin' : null,
    escalation_level: 0,
    last_escalated_at: null,
  };
}

const rows = buildMaintenanceConsole(
  [
    row('a', 'field_tech', 'critical', false),
    row('b', 'field_tech', 'warning', false),
    row('c', 'network_ops', 'critical', true),
    row('d', null, 'warning', false),
    row('e', 'desconhecido_da_rede', 'critical', false), // vira triage
  ],
  NOW
).rows;

describe('buildOwnerBuckets', () => {
  it('particiona todas as linhas entre os baldes (I1)', () => {
    const buckets = buildOwnerBuckets(rows);
    const owned = buckets.filter((b) => b.key !== 'all');
    expect(owned.reduce((acc, b) => acc + b.total, 0)).toBe(rows.length);
  });

  it('não oferece balde vazio e mantém `all` primeiro (I2)', () => {
    const buckets = buildOwnerBuckets(rows);
    expect(buckets[0].key).toBe('all');
    expect(buckets.every((b) => b.total > 0 || b.key === 'all')).toBe(true);
    expect(buckets.some((b) => b.key === 'registry_admin')).toBe(false);
  });

  it('conta abertos e críticos por dono (I6)', () => {
    const buckets = buildOwnerBuckets(rows);
    const field = buckets.find((b) => b.key === 'field_tech');
    expect(field).toMatchObject({ open: 2, critical: 1, total: 2 });
    const net = buckets.find((b) => b.key === 'network_ops');
    expect(net).toMatchObject({ open: 0, critical: 0, total: 1 });
  });

  it('rotula alerta sem roteamento como balde próprio', () => {
    const buckets = buildOwnerBuckets(rows);
    expect(buckets.find((b) => b.key === 'unrouted')?.label).toBe('Sem responsável');
    expect(buckets[buckets.length - 1].key).toBe('unrouted');
  });

  it('dono fora do vocabulário cai em triagem, nunca lança', () => {
    const buckets = buildOwnerBuckets(rows);
    expect(buckets.find((b) => b.key === 'triage')?.total).toBe(1);
  });

  it('lista vazia ainda oferece `all`', () => {
    const buckets = buildOwnerBuckets([]);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ key: 'all', open: 0, total: 0 });
  });
});

describe('applyOwnerFilter', () => {
  it('`all` é identidade referencial (I4)', () => {
    expect(applyOwnerFilter(rows, 'all')).toBe(rows);
  });

  it('preserva a ordem e é idempotente (I3)', () => {
    const filtered = applyOwnerFilter(rows, 'field_tech');
    expect(filtered.map((r) => r.id)).toEqual(
      rows.filter((r) => r.routing?.owner === 'field_tech').map((r) => r.id)
    );
    expect(applyOwnerFilter(filtered, 'field_tech')).toEqual(filtered);
  });

  it('recorta os não roteados', () => {
    expect(applyOwnerFilter(rows, 'unrouted').map((r) => r.id)).toEqual(['d']);
  });
});

describe('resolveOwnerFilter', () => {
  const buckets = buildOwnerBuckets(rows);

  it('degrada chave inexistente, nula ou indefinida para `all` (I5)', () => {
    for (const bogus of ['registry_admin', 'nao-existe', '', null, undefined]) {
      expect(resolveOwnerFilter(buckets, bogus)).toBe('all');
    }
  });

  it('mantém chave válida', () => {
    const key: OwnerFilterKey = 'field_tech';
    expect(resolveOwnerFilter(buckets, key)).toBe('field_tech');
  });
});
