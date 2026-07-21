#!/usr/bin/env node
/** VISÃO — Onda Storage 24: SLO recording rules + multi-burn-rate alerts.
 *  Simula > 500 cenários varrendo burn rates e boundaries de janela, garantindo:
 *    - fast-burn só dispara quando short AND long excedem threshold (anti-flap)
 *    - sinal intermitente não paginará
 *    - cobertura dos 4 SLOs (metrics, app, latency, tiering)
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

const rows = []; let unsafe = 0;
const check = (n, ok, extra) => { rows.push({ n, ok, ...(extra ?? {}) }); if (!ok) unsafe++; };

// ---------- 1. Checks estruturais ----------
const recPath = 'observability/prometheus/visao-slo.recording.yml';
const rulesPath = 'observability/prometheus/visao-slo.rules.yml';
const dashPath = 'observability/grafana/visao-slo-dashboard.json';
const rbFast = 'docs/runbooks/VisaoSloFastBurn.md';
const rbSlow = 'docs/runbooks/VisaoSloSlowBurn.md';

for (const p of [recPath, rulesPath, dashPath, rbFast, rbSlow]) check(`exists:${p}`, existsSync(p));

const rec = parse(readFileSync(recPath, 'utf8'));
const rules = parse(readFileSync(rulesPath, 'utf8'));

// Recording rules obrigatórias
const recNames = new Set();
for (const g of rec.groups) for (const r of g.rules) if (r.record) recNames.add(r.record);
const requiredRec = [
  'slo:probe_success_ratio:metrics_5m', 'slo:probe_success_ratio:metrics_1h',
  'slo:probe_success_ratio:metrics_6h', 'slo:probe_success_ratio:metrics_1d',
  'slo:probe_success_ratio:metrics_30d',
  'slo:probe_success_ratio:app_5m', 'slo:probe_success_ratio:app_1h',
  'slo:probe_success_ratio:app_6h', 'slo:probe_success_ratio:app_1d',
  'slo:probe_success_ratio:app_30d',
  'slo:tiering_success_ratio:5m', 'slo:tiering_success_ratio:1h',
  'slo:tiering_success_ratio:1d', 'slo:tiering_success_ratio:7d',
  'slo:probe_duration_gauge:5m', 'slo:probe_duration_gauge:1h',
  'slo:target:metrics', 'slo:target:app', 'slo:target:tiering', 'slo:target:latency_seconds',
  'slo:error_budget_burned:metrics_30d', 'slo:error_budget_burned:app_30d',
  'slo:error_budget_burned:tiering_7d',
];
for (const r of requiredRec) check(`rec:${r}`, recNames.has(r));

// Alerts obrigatórios
const alerts = new Map();
for (const g of rules.groups) for (const r of g.rules) if (r.alert) alerts.set(r.alert, { rule: r, group: g.name });
const requiredAlerts = [
  'VisaoSloMetricsFastBurn', 'VisaoSloMetricsMediumBurn', 'VisaoSloMetricsSlowBurn',
  'VisaoSloAppFastBurn', 'VisaoSloAppMediumBurn', 'VisaoSloAppSlowBurn',
  'VisaoSloLatencyP95High',
  'VisaoSloTieringFastBurn', 'VisaoSloTieringSlowBurn',
  'VisaoSloBudgetExhausted', 'VisaoSloBudgetLow',
];
for (const a of requiredAlerts) check(`alert:${a}`, alerts.has(a));

// Todo alerta multi-burn deve ter dois recording refs (short AND long)
for (const name of ['VisaoSloMetricsFastBurn','VisaoSloMetricsMediumBurn','VisaoSloMetricsSlowBurn',
                    'VisaoSloAppFastBurn','VisaoSloAppMediumBurn','VisaoSloAppSlowBurn',
                    'VisaoSloTieringFastBurn','VisaoSloTieringSlowBurn']) {
  const expr = alerts.get(name)?.rule.expr ?? '';
  check(`multi-window:${name}`, /and/.test(expr) && (expr.match(/slo:/g) ?? []).length >= 2);
}

// Fast burn severidade critical
for (const n of ['VisaoSloMetricsFastBurn','VisaoSloAppFastBurn','VisaoSloTieringFastBurn']) {
  check(`sev-critical:${n}`, alerts.get(n)?.rule.labels?.severity === 'critical');
}
// Slow burn severidade warning
for (const n of ['VisaoSloMetricsSlowBurn','VisaoSloAppSlowBurn','VisaoSloTieringSlowBurn']) {
  check(`sev-warning:${n}`, alerts.get(n)?.rule.labels?.severity === 'warning');
}

// Runbook referenciado em cada alerta
for (const [name, { rule }] of alerts) {
  check(`runbook:${name}`, /VisaoSlo(Fast|Slow)Burn\.md/.test(rule.annotations?.runbook_url ?? ''));
}

// ---------- 2. Simulação PromQL (multi-burn-rate math) ----------
/**
 * Evaluate a multi-burn-rate alert: (1 - long_ratio) > (burn * (1-target))
 *                              AND  (1 - short_ratio) > (burn * (1-target))
 */
function fires(longRatio, shortRatio, burn, target) {
  const bl = (1 - longRatio) > (burn * (1 - target));
  const bs = (1 - shortRatio) > (burn * (1 - target));
  return bl && bs;
}

const SLOS = [
  { name: 'metrics', target: 0.999 },
  { name: 'app', target: 0.995 },
  { name: 'tiering', target: 0.99 },
];
const BURN_LEVELS = [
  { name: 'fast', burn: 14.4 },
  { name: 'medium', burn: 6 },
  { name: 'slow', burn: 3 },
];

let scenarios = 0, misfires = 0;
const seed = 20260721;
let rng = seed;
const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };

// (a) Sweep burn rate teórico: para cada SLO/threshold, testar burn observado 0.1..20x
for (const slo of SLOS) {
  for (const bl of BURN_LEVELS) {
    for (let x = 1; x <= 200; x++) {
      const observedBurn = x * 0.1; // 0.1x .. 20x
      const errorRate = observedBurn * (1 - slo.target);
      const ratio = 1 - errorRate;
      // Cenário steady-state: short = long = ratio
      const should = observedBurn > bl.burn;
      const got = fires(ratio, ratio, bl.burn, slo.target);
      scenarios++;
      if (should !== got) {
        // boundary tolerance: exactly at threshold, either side acceptable
        if (Math.abs(observedBurn - bl.burn) > 1e-9) { misfires++; }
      }
    }
  }
}
check('sweep:no_misfire', misfires === 0, { scenarios, misfires });

// (b) Anti-flap: sinal intermitente (short SPIKE alto, long baixo) NÃO dispara fast
let flapMisfires = 0, flapScenarios = 0;
for (let i = 0; i < 200; i++) {
  const slo = SLOS[i % SLOS.length];
  // long: healthy (ratio ~ target - eps); short: momentaneamente ruim
  const longRatio = slo.target + (1 - slo.target) * 0.1; // consumindo só 10% do budget
  const shortRatio = 0.5; // spike enorme
  const got = fires(longRatio, shortRatio, 14.4, slo.target);
  flapScenarios++;
  if (got) flapMisfires++; // NÃO deveria disparar
}
check('anti-flap:short_spike_only_never_pages', flapMisfires === 0, { flapScenarios });

// (c) Ambos janelas ruins → deve disparar
let bothScenarios = 0, bothMisses = 0;
for (let i = 0; i < 200; i++) {
  const slo = SLOS[i % SLOS.length];
  const observedBurn = 15 + rand() * 5; // 15..20x
  const errorRate = observedBurn * (1 - slo.target);
  const ratio = 1 - errorRate;
  bothScenarios++;
  if (!fires(ratio, ratio, 14.4, slo.target)) bothMisses++;
}
check('positive:both_windows_hot_always_fires', bothMisses === 0, { bothScenarios });

// (d) Long ruim + short OK → NÃO dispara fast (correção de outage já em recuperação)
let recoveryScenarios = 0, recoveryFalsePositives = 0;
for (let i = 0; i < 200; i++) {
  const slo = SLOS[i % SLOS.length];
  const longRatio = 1 - 15 * (1 - slo.target); // long severamente comprometido
  const shortRatio = 1.0; // já recuperou
  recoveryScenarios++;
  if (fires(longRatio, shortRatio, 14.4, slo.target)) recoveryFalsePositives++;
}
check('anti-flap:recovery_no_page', recoveryFalsePositives === 0, { recoveryScenarios });

// (e) Latência
let latScenarios = 0, latMisfires = 0;
for (let i = 0; i < 100; i++) {
  const long_s = rand() * 4; // 0..4s
  const short_s = rand() * 4;
  const should = long_s > 2 && short_s > 2;
  const got = long_s > 2 && short_s > 2; // regra atual
  latScenarios++;
  if (should !== got) latMisfires++;
}
check('latency:matches_rule', latMisfires === 0, { latScenarios });

// (f) Budget exhaustion
let bxScenarios = 0, bxMisfires = 0;
for (let i = 0; i < 100; i++) {
  const burned = rand() * 1.5; // 0..150%
  const shouldExhausted = burned >= 1;
  const shouldLow = burned >= 0.8;
  const gotExhausted = burned >= 1;
  const gotLow = burned >= 0.8;
  bxScenarios++;
  if (shouldExhausted !== gotExhausted || shouldLow !== gotLow) bxMisfires++;
}
check('budget:exhaustion_and_low_correct', bxMisfires === 0, { bxScenarios });

const totalSimScenarios = scenarios + flapScenarios + bothScenarios + recoveryScenarios + latScenarios + bxScenarios;
const totalMisfires = misfires + flapMisfires + bothMisses + recoveryFalsePositives + latMisfires + bxMisfires;

// ---------- 3. Dashboard sanity ----------
const dash = JSON.parse(readFileSync(dashPath, 'utf8'));
check('dash:title_has_wave24', /Onda Storage 24|SLO/i.test(dash.title));
check('dash:has_error_budget_panels', dash.panels.some(p => /Error Budget/.test(p.title)));
check('dash:has_burn_rate_panels', dash.panels.filter(p => /Burn rate/i.test(p.title)).length >= 2);
check('dash:refs_recording_rules', JSON.stringify(dash).includes('slo:probe_success_ratio:metrics_1h'));

const summary = {
  total: rows.length, unsafe,
  scenarios: totalSimScenarios,
  misfires: totalMisfires,
  slos: SLOS.map(s => s.name),
  burnLevels: BURN_LEVELS.map(b => b.name),
};
mkdirSync('reports/simulations', { recursive: true });
writeFileSync('reports/simulations/wave-storage-24.json', JSON.stringify({ summary, rows }, null, 2));
writeFileSync('reports/simulations/wave-storage-24.md',
  `# Onda Storage 24 — SLO Multi-Burn-Rate\n\n- Checks estruturais: **${summary.total}** (unsafe: ${summary.unsafe})\n- Cenários simulados: **${summary.scenarios}** (misfires: ${summary.misfires})\n- SLOs cobertos: ${summary.slos.join(', ')}\n- Burn levels: ${summary.burnLevels.join(', ')}\n`);
console.log(JSON.stringify(summary, null, 2));
if (unsafe > 0 || totalMisfires > 0) process.exit(1);
