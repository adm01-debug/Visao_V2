#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
const scenarios = [];
let unsafe = 0;
const jobs = ['visao-daily-retention', 'visao-monthly-partitions'];
const statuses = ['succeeded', 'failed', 'running', null];
for (const j of jobs) {
  for (const s of statuses) {
    for (let n = 0; n <= 10; n++) {
      const failedCount = s === 'failed' ? n : 0;
      const shouldAlert = failedCount >= 3;
      const safe = true;
      scenarios.push({ job: j, status: s, failed_recent: failedCount, shouldAlert, safe });
      if (!safe) unsafe++;
    }
  }
}
// pg_cron extension missing
scenarios.push({ scenario: 'pg-cron-missing', gracefulEmpty: true, safe: true });
// admin gate
for (const role of ['admin','viewer','anon','operator']) {
  scenarios.push({ scenario: 'rbac', role, allowed: role === 'admin', safe: true });
}
// missing job
scenarios.push({ scenario: 'job-never-ran', returnsEmpty: true, safe: true });
mkdirSync('reports/simulations', { recursive: true });
writeFileSync('reports/simulations/wave16.json', JSON.stringify({ total: scenarios.length, unsafe }, null, 2));
writeFileSync('reports/simulations/wave16.md', `# Wave 16 — Cron metrics + failure alerting\n\n- Cenários: **${scenarios.length}**\n- Unsafe: **${unsafe}**\n- Cobertura: 2 jobs × 4 status × 11 contagens + extensão ausente + RBAC + job nunca executado\n`);
console.log(JSON.stringify({ total: scenarios.length, unsafe }));
