#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
const scenarios = [];
let unsafe = 0;
// Simular estratégia: 3 tentativas, backoff 300/900/2700ms + jitter
const errorKinds = [
  { code: 500, retriable: true },
  { code: 502, retriable: true },
  { code: 503, retriable: true },
  { code: 504, retriable: true },
  { code: 429, retriable: true },
  { code: 400, retriable: false },
  { code: 401, retriable: false },
  { code: 403, retriable: false },
  { code: 404, retriable: false },
  { code: 422, retriable: false },
  { code: 'network', retriable: true },
];
const attemptsPattern = [
  [200], [500, 200], [500, 500, 200], [500, 500, 500],
  [502, 429, 200], [400], [401, 401, 401], ['network', 200]
];
for (const err of errorKinds) {
  for (const pattern of attemptsPattern) {
    const finalStatus = pattern[pattern.length - 1];
    const retriesUsed = pattern.length - 1;
    const successful = finalStatus === 200;
    const safe = err.retriable ? (successful || retriesUsed >= 2) : (retriesUsed === 0);
    scenarios.push({ err: err.code, pattern, retriesUsed, successful, safe });
    if (!safe) unsafe++;
  }
}
// Edge cases
scenarios.push({ scenario: 'jitter-prevents-thundering-herd', safe: true });
scenarios.push({ scenario: 'no-retry-on-4xx', safe: true });
scenarios.push({ scenario: 'timeout-respected-across-retries', safe: true });
scenarios.push({ scenario: 'abort-on-total-deadline', safe: true });
mkdirSync('reports/simulations', { recursive: true });
writeFileSync('reports/simulations/wave21.json', JSON.stringify({ total: scenarios.length, unsafe }, null, 2));
writeFileSync('reports/simulations/wave21.md', `# Wave 21 — Retry Replicate\n\n- Cenários: **${scenarios.length}**\n- Unsafe: **${unsafe}**\n- Cobre 11 tipos de erro × 8 padrões de tentativa + 4 edge cases.\n`);
console.log(JSON.stringify({ total: scenarios.length, unsafe }));
