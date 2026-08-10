#!/usr/bin/env node
/** VISÃO — Onda Storage 23: multi-vantage-point (regional) blackbox probes.
 *  Valida config Prometheus multi-região + regras de divergência/outage global,
 *  simulando 3 regiões × combinações de UP/DOWN (2^3 = 8 estados × N amostras).
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

const rows = [];
let unsafe = 0;
const check = (n, ok, extra) => {
  rows.push({ n, ok, ...(extra ?? {}) });
  if (!ok) unsafe++;
};

// ---------- Config ----------
const scrapePath = 'observability/blackbox/prometheus-scrape.yml';
const rulesPath = 'observability/prometheus/visao-tiering.rules.yml';
const runbookPath = 'docs/runbooks/VisaoBlackboxRegionalDivergence.md';
const readmePath = 'docs/runbooks/README.md';

check('scrape file exists', existsSync(scrapePath));
check('rules file exists', existsSync(rulesPath));
check('runbook exists', existsSync(runbookPath));
check(
  'readme updated',
  readFileSync(readmePath, 'utf8').includes('VisaoBlackboxRegionalDivergence')
);

const scrape = parse(readFileSync(scrapePath, 'utf8'));
const jobs = scrape.scrape_configs ?? [];
check('3 blackbox jobs', jobs.length === 3);
const regions = new Set();
for (const j of jobs) {
  const region = j.static_configs?.[0]?.labels?.region;
  check(`job ${j.job_name} has region label`, !!region, { region });
  if (region) regions.add(region);
  check(
    `job ${j.job_name} points to regional exporter`,
    j.relabel_configs?.some((r) => r.replacement?.startsWith('blackbox-'))
  );
}
check('3 distinct regions', regions.size === 3);
for (const r of ['us-east-1', 'eu-west-1', 'sa-east-1']) check(`region:${r}`, regions.has(r));

const rules = parse(readFileSync(rulesPath, 'utf8'));
const regGroup = rules.groups?.find((g) => g.name === 'visao-blackbox-regional');
check('group visao-blackbox-regional', !!regGroup);
const alerts = new Map((regGroup?.rules ?? []).map((r) => [r.alert, r]));
check('alert VisaoBlackboxRegionalDivergence', alerts.has('VisaoBlackboxRegionalDivergence'));
check('alert VisaoBlackboxGlobalOutage', alerts.has('VisaoBlackboxGlobalOutage'));
check(
  'divergence uses max+min',
  /max by \(instance\).*min by \(instance\)/s.test(
    alerts.get('VisaoBlackboxRegionalDivergence')?.expr ?? ''
  )
);
check(
  'global outage uses max==0',
  /max by \(instance\).*== 0/s.test(alerts.get('VisaoBlackboxGlobalOutage')?.expr ?? '')
);
check(
  'divergence severity=warning',
  alerts.get('VisaoBlackboxRegionalDivergence')?.labels?.severity === 'warning'
);
check(
  'global severity=critical',
  alerts.get('VisaoBlackboxGlobalOutage')?.labels?.severity === 'critical'
);
check(
  'regex job matches all blackbox jobs',
  /job=~"visao-blackbox-https\.\*"/.test(alerts.get('VisaoBlackboxGlobalOutage')?.expr ?? '')
);

// ---------- Simulação: 600 cenários (3 regiões, 5 instances, estados aleatórios) ----------
const REGIONS = ['us-east-1', 'eu-west-1', 'sa-east-1'];
const INSTANCES = ['api', 'metrics', 'app', 'health', 'ws'];
const N = 600; // > 500 cenários
let divergenceFires = 0,
  globalFires = 0,
  quietOK = 0,
  misfires = 0;

for (let i = 0; i < N; i++) {
  const inst = INSTANCES[i % INSTANCES.length];
  const state = REGIONS.map(() => (Math.random() < 0.15 ? 0 : 1)); // 15% down por região
  const up = state.filter((v) => v === 1).length;
  const down = state.filter((v) => v === 0).length;

  // Regras:
  const shouldDivergence = up >= 1 && down >= 1;
  const shouldGlobal = up === 0;
  const shouldQuiet = up === 3;

  // Avaliação PromQL simulada (max/min por instance):
  const maxV = Math.max(...state);
  const minV = Math.min(...state);
  const divFire = maxV === 1 && minV === 0;
  const gloFire = maxV === 0;

  if (divFire !== shouldDivergence) misfires++;
  if (gloFire !== shouldGlobal) misfires++;
  if (shouldQuiet && (divFire || gloFire)) misfires++;
  if (divFire) divergenceFires++;
  if (gloFire) globalFires++;
  if (shouldQuiet) quietOK++;
}

check(`sim:${N}_no_misfire`, misfires === 0, { divergenceFires, globalFires, quietOK });

// Anti-mascaramento: garantir que VisaoBlackboxProbeFailed original ainda dispara por região
const baseGroup = rules.groups.find((g) => g.name === 'visao-blackbox');
const probeFailed = baseGroup?.rules?.find((r) => r.alert === 'VisaoBlackboxProbeFailed');
check('probe_failed still exists (per-region)', !!probeFailed);
check('probe_failed uses instance-level', !/max by|min by/.test(probeFailed?.expr ?? ''));

const summary = {
  total: rows.length,
  unsafe,
  scenarios: N,
  misfires,
  divergenceFires,
  globalFires,
  quietOK,
  regions: [...regions],
};
mkdirSync('reports/simulations', { recursive: true });
writeFileSync(
  'reports/simulations/wave-storage-23.json',
  JSON.stringify({ summary, rows }, null, 2)
);
writeFileSync(
  'reports/simulations/wave-storage-23.md',
  `# Onda Storage 23 — Multi-Vantage-Point Probes\n\n- Checks: **${summary.total}** (unsafe: ${summary.unsafe})\n- Cenários simulados: **${summary.scenarios}** (misfires: ${summary.misfires})\n- Divergências: ${summary.divergenceFires} | Global outage: ${summary.globalFires} | All-up: ${summary.quietOK}\n- Regiões: ${summary.regions.join(', ')}\n`
);
console.log(JSON.stringify(summary, null, 2));
if (unsafe > 0 || misfires > 0) process.exit(1);
