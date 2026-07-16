import { describe, it, expect } from 'vitest';
import { evaluateHealth, HEALTH_THRESHOLDS } from '@/lib/dbHealthGuard';

const base = {
  database: 'up' as const,
  pgbouncer: 'up' as const,
  memoryPct: 30,
  dataDiskPct: 20,
  connectionsUsed: 5,
  connectionsMax: 60,
  poolUsed: 1,
  poolMax: 200,
  walMB: 100,
  rolledBack: 500,
  restarts: 0,
};

describe('evaluateHealth', () => {
  it('snapshot atual do MCP → sem alertas', () => {
    const alerts = evaluateHealth({ ...base, memoryPct: 53, dataDiskPct: 16, connectionsUsed: 9, walMB: 112 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('info');
  });

  it('memória crítica', () => {
    const a = evaluateHealth({ ...base, memoryPct: HEALTH_THRESHOLDS.memoryCrit });
    expect(a.some((x) => x.level === 'critical' && x.metric === 'memory')).toBe(true);
  });

  it('disco warning', () => {
    const a = evaluateHealth({ ...base, dataDiskPct: HEALTH_THRESHOLDS.diskWarn });
    expect(a.some((x) => x.level === 'warning' && x.metric === 'disk')).toBe(true);
  });

  it('conexões saturadas', () => {
    const a = evaluateHealth({ ...base, connectionsUsed: 58 });
    expect(a.some((x) => x.metric === 'connections')).toBe(true);
  });

  it('database down é critical', () => {
    const a = evaluateHealth({ ...base, database: 'down' });
    expect(a[0].level).toBe('critical');
  });

  it('restarts > 0 gera warning', () => {
    const a = evaluateHealth({ ...base, restarts: 2 });
    expect(a.some((x) => x.metric === 'restarts')).toBe(true);
  });
});
