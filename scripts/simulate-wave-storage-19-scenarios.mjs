#!/usr/bin/env node
/** VISÃO — Onda Storage 19: runbooks executáveis. */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ALERTS = [
  'VisaoTieringSloViolated',
  'VisaoTieringSloAtRisk',
  'VisaoTieringSuccessRatioLow',
  'VisaoGlacierRestoreStuck',
  'VisaoGlacierStuckAlertsSpike',
  'VisaoTieringMetricsAbsent',
];
const REQUIRED = [
  '## Sintomas',
  '## Diagnóstico',
  '## Mitigação',
  '## Escalonamento',
  '## Pós-incidente',
];

const rows = [];
let unsafe = 0;
for (const a of ALERTS) {
  const path = join('docs/runbooks', `${a}.md`);
  const exists = existsSync(path);
  const body = exists ? readFileSync(path, 'utf8') : '';
  for (const sec of REQUIRED) {
    const ok = body.includes(sec);
    if (!ok) unsafe++;
    rows.push({ alert: a, section: sec, ok });
  }
  // Deve conter ao menos um bloco de código (comando pronto)
  const hasCmd = body.includes('```');
  if (!hasCmd) unsafe++;
  rows.push({ alert: a, section: 'code_block', ok: hasCmd });
}
// Índice
const idxOk = existsSync('docs/runbooks/README.md');
if (!idxOk) unsafe++;
rows.push({ alert: 'INDEX', section: 'README', ok: idxOk });

// Cross-check: cada runbook referenciado por annotation `runbook:` nas rules
const rules = readFileSync('observability/prometheus/visao-tiering.rules.yml', 'utf8');
for (const a of ALERTS) {
  const referenced = rules.includes(a);
  rows.push({ alert: a, section: 'referenced_in_rules', ok: referenced });
  if (!referenced) unsafe++;
}

const summary = { total: rows.length, unsafe, alerts: ALERTS.length };
mkdirSync('reports/simulations', { recursive: true });
writeFileSync(
  'reports/simulations/wave-storage-19.json',
  JSON.stringify({ summary, rows }, null, 2)
);
writeFileSync(
  'reports/simulations/wave-storage-19.md',
  `# Onda Storage 19 — Runbooks executáveis\n\n- Total: **${summary.total}**\n- Unsafe: **${summary.unsafe}**\n- Alertas cobertos: **${summary.alerts}**\n`
);
console.log(JSON.stringify(summary, null, 2));
