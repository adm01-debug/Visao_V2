// Wave 39 — Simulação: fuzz 400 snapshots contra guarda de saúde.
import { mkdirSync, writeFileSync } from 'node:fs';
import { evaluateHealth, HEALTH_THRESHOLDS } from '../src/lib/dbHealthGuard.ts';

let pass = 0, fail = 0;
const failures = [];

// Snapshot real capturado do MCP em 2026-07-16
const realSnapshot = {
  database: 'up', pgbouncer: 'up',
  memoryPct: 53, dataDiskPct: 16,
  connectionsUsed: 9, connectionsMax: 60,
  poolUsed: 1, poolMax: 200,
  walMB: 112, rolledBack: 549, restarts: 0,
};
const realAlerts = evaluateHealth(realSnapshot);
if (realAlerts.length === 1 && realAlerts[0].level === 'info') pass++;
else { fail++; failures.push({ case: 'real-snapshot', alerts: realAlerts }); }

// 400 snapshots aleatórios
for (let i = 0; i < 400; i++) {
  const s = {
    database: Math.random() < 0.98 ? 'up' : 'down',
    pgbouncer: Math.random() < 0.98 ? 'up' : 'down',
    memoryPct: Math.floor(Math.random() * 100),
    dataDiskPct: Math.floor(Math.random() * 100),
    connectionsUsed: Math.floor(Math.random() * 60),
    connectionsMax: 60,
    poolUsed: Math.floor(Math.random() * 200),
    poolMax: 200,
    walMB: Math.floor(Math.random() * 1500),
    rolledBack: Math.floor(Math.random() * 1000),
    restarts: Math.random() < 0.1 ? 1 + Math.floor(Math.random() * 3) : 0,
  };
  const alerts = evaluateHealth(s);
  // Invariantes
  const hasCritIfDown = s.database === 'down' ? alerts.some((a) => a.level === 'critical' && a.metric === 'database') : true;
  const memRule = s.memoryPct >= HEALTH_THRESHOLDS.memoryCrit
    ? alerts.some((a) => a.metric === 'memory' && a.level === 'critical')
    : s.memoryPct >= HEALTH_THRESHOLDS.memoryWarn
      ? alerts.some((a) => a.metric === 'memory' && a.level === 'warning')
      : !alerts.some((a) => a.metric === 'memory');
  const ok = hasCritIfDown && memRule && alerts.length > 0;
  if (!ok) { fail++; failures.push({ i, s, alerts }); }
  else pass++;
}

mkdirSync('reports/simulations', { recursive: true });
writeFileSync('reports/simulations/wave39.json', JSON.stringify({
  wave: 39, total: pass + fail, pass, fail,
  realSnapshot, realAlerts,
  failures: failures.slice(0, 5),
}, null, 2));
console.log(`wave39: ${pass}/${pass + fail} pass`);
if (fail) process.exit(1);
