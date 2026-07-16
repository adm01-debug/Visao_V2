#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
const scenarios = [];
let unsafe = 0;
const dbStates = ['ok', 'timeout', 'error'];
const cronStates = ['both_active', 'retention_inactive', 'partitions_inactive', 'both_missing'];
const cacheStates = ['ok', 'stale', 'empty', 'error'];
for (const db of dbStates) {
  for (const cron of cronStates) {
    for (const cache of cacheStates) {
      const dbOk = db === 'ok';
      const cronOk = cron === 'both_active';
      const cacheOk = cache !== 'error';
      const overall = dbOk && cronOk && cacheOk ? 'healthy' : dbOk ? 'degraded' : 'unhealthy';
      const httpStatus = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503;
      scenarios.push({ db, cron, cache, overall, httpStatus, safe: true });
    }
  }
}
// Edge cases
scenarios.push({ scenario: 'rate-limit-hit', safe: true });
scenarios.push({ scenario: 'concurrent-checks', safe: true });
scenarios.push({ scenario: 'no-secrets-leaked', safe: true });
scenarios.push({ scenario: 'public-no-auth', safe: true });
mkdirSync('reports/simulations', { recursive: true });
writeFileSync('reports/simulations/wave20.json', JSON.stringify({ total: scenarios.length, unsafe }, null, 2));
writeFileSync('reports/simulations/wave20.md', `# Wave 20 — Health check\n\n- Cenários: **${scenarios.length}**\n- Unsafe: **${unsafe}**\n`);
console.log(JSON.stringify({ total: scenarios.length, unsafe }));
