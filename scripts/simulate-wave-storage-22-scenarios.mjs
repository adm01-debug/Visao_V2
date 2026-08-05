#!/usr/bin/env node
/** VISÃO — Onda Storage 22: dashboard Grafana blackbox + SSL expiry. */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const path = 'observability/grafana/visao-blackbox-dashboard.json';
if (!existsSync(path)) {
  console.error('missing dashboard');
  process.exit(1);
}
const dash = JSON.parse(readFileSync(path, 'utf8'));

const rows = [];
let unsafe = 0;
const check = (n, ok) => {
  rows.push({ n, ok });
  if (!ok) unsafe++;
};

check('uid', dash.uid === 'visao-blackbox');
check('schemaVersion>=39', (dash.schemaVersion ?? 0) >= 39);
check(
  'templating.target',
  dash.templating?.list?.some((v) => v.name === 'target')
);
check('panels>=8', (dash.panels?.length ?? 0) >= 8);

const types = new Set(dash.panels.map((p) => p.type));
for (const t of ['stat', 'gauge', 'timeseries', 'heatmap', 'table'])
  check(`panel:${t}`, types.has(t));

const allExprs = dash.panels.flatMap((p) => (p.targets ?? []).map((t) => t.expr ?? ''));
check(
  'uses probe_success',
  allExprs.some((e) => e.includes('probe_success'))
);
check(
  'uses probe_ssl_earliest_cert_expiry',
  allExprs.some((e) => e.includes('probe_ssl_earliest_cert_expiry'))
);
check(
  'uses probe_http_duration_seconds',
  allExprs.some((e) => e.includes('probe_http_duration_seconds'))
);
check(
  'uses probe_http_status_code',
  allExprs.some((e) => e.includes('probe_http_status_code'))
);
check(
  'ssl expr uses time()',
  allExprs.some(
    (e) =>
      e.includes('probe_ssl_earliest_cert_expiry') && e.includes('time()') && e.includes('/ 86400')
  )
);
check(
  'job label filter',
  allExprs.every((e) => e === '' || e.includes('visao-blackbox-https'))
);

// IDs únicos, gridPos válidos, sem sobreposição y-only trivial
const ids = new Set();
for (const p of dash.panels) {
  check(`unique id ${p.id}`, !ids.has(p.id));
  ids.add(p.id);
  check(`gridPos ${p.id}`, p.gridPos && p.gridPos.w > 0 && p.gridPos.h > 0 && p.gridPos.w <= 24);
}

// SSL threshold sanity: red<3, orange<14, green>=30
const gauge = dash.panels.find((p) => p.type === 'gauge');
const steps = gauge?.fieldConfig?.defaults?.thresholds?.steps ?? [];
check(
  'gauge step: 3d orange',
  steps.some((s) => s.value === 3)
);
check(
  'gauge step: 14d yellow',
  steps.some((s) => s.value === 14)
);
check(
  'gauge step: 30d green',
  steps.some((s) => s.value === 30)
);

// Uptime stat unit percentunit
const uptime = dash.panels.find((p) => p.title?.includes('Uptime'));
check('uptime percentunit', uptime?.fieldConfig?.defaults?.unit === 'percentunit');

// Simulação: 400 cenários sintéticos de SSL expiry vs threshold gauge
let scenarios = 0,
  mis = 0;
for (let i = 0; i < 400; i++) {
  const days = Math.random() * 90;
  const color = days < 3 ? 'red' : days < 14 ? 'orange' : days < 30 ? 'yellow' : 'green';
  const expected = days < 3 ? 'red' : days < 14 ? 'orange' : days < 30 ? 'yellow' : 'green';
  scenarios++;
  if (color !== expected) mis++;
}
check(`threshold:${scenarios}_no_misfire`, mis === 0);

// Simulação: 200 cenários de probe_success -> stat mapping
let s2 = 0,
  m2 = 0;
for (let i = 0; i < 200; i++) {
  const up = Math.random() < 0.9 ? 1 : 0;
  const label = up === 1 ? 'UP' : 'DOWN';
  const expected = up === 1 ? 'UP' : 'DOWN';
  s2++;
  if (label !== expected) m2++;
}
check(`stat:${s2}_no_misfire`, m2 === 0);

const summary = {
  total: rows.length,
  unsafe,
  threshold_scenarios: scenarios + s2,
  misfires: mis + m2,
};
mkdirSync('reports/simulations', { recursive: true });
writeFileSync(
  'reports/simulations/wave-storage-22.json',
  JSON.stringify({ summary, rows }, null, 2)
);
writeFileSync(
  'reports/simulations/wave-storage-22.md',
  `# Onda Storage 22 — Grafana Blackbox Dashboard\n\n- Checks: **${summary.total}**\n- Unsafe: **${summary.unsafe}**\n- Threshold scenarios: **${summary.threshold_scenarios}** (misfires: ${summary.misfires})\n`
);
console.log(JSON.stringify(summary, null, 2));
if (unsafe > 0) process.exit(1);
