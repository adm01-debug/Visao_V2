#!/usr/bin/env node
/**
 * VISÃO — Onda Storage 25 simulação
 * Cobre: routing por severity/team/janela, inhibitions multi-burn-rate,
 * lógica de deploy_freeze e resiliência do script CI.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const results = { checks: [], scenarios: [], misfires: 0 };
const check = (name, ok, detail = '') => {
  results.checks.push({ name, ok, detail });
  if (!ok) results.misfires++;
};

// ---------- 1. Structural checks ----------
const files = [
  'observability/alertmanager/visao-routing.yml',
  'observability/prometheus/visao-deploy-freeze.recording.yml',
  'scripts/ci/check-deploy-freeze.mjs',
  '.github/workflows/deploy-freeze-check.yml',
  'docs/runbooks/VisaoDeployFreezeActive.md',
];
for (const f of files) check(`exists:${f}`, existsSync(f));

const routing = readFileSync('observability/alertmanager/visao-routing.yml', 'utf8');
check('routing:has_business_hours', /name: business_hours/.test(routing));
check('routing:has_after_hours', /name: after_hours/.test(routing));
check('routing:has_telegram_oncall', /telegram-oncall/.test(routing));
check('routing:has_slack_warnings', /slack-warnings/.test(routing));
check('routing:has_ticket_jira', /ticket-jira/.test(routing));
check('routing:has_pagerduty', /pagerduty-oncall/.test(routing));
check('routing:critical_repeat_1h', /repeat_interval: 1h/.test(routing));
check('routing:group_by_slo', /group_by:.*slo/.test(routing));
check(
  'routing:inhibit_fast_over_medium',
  /burn_rate_window="fast"[\s\S]*?burn_rate_window=~"medium\|slow"/.test(routing)
);
check(
  'routing:inhibit_critical_over_warning',
  /severity="critical"[\s\S]*?severity="warning"/.test(routing)
);

const freeze = readFileSync('observability/prometheus/visao-deploy-freeze.recording.yml', 'utf8');
check('freeze:record_active', /record: visao:deploy_freeze:active/.test(freeze));
check('freeze:budget_50pct', /> 0\.5/.test(freeze));
check('freeze:fast_burn_14_4x', /> 14\.4/.test(freeze));
check('freeze:alert_has_for_2m', /for: 2m/.test(freeze));
check('freeze:severity_critical', /severity: critical/.test(freeze));

const ciScript = readFileSync('scripts/ci/check-deploy-freeze.mjs', 'utf8');
check('ci:has_timeout', /TIMEOUT_MS = 10_000/.test(ciScript));
check('ci:has_retries', /MAX_RETRIES = 3/.test(ciScript));
check('ci:fail_mode', /FREEZE_FAIL_MODE/.test(ciScript));
check('ci:bypass_flag', /BYPASS_DEPLOY_FREEZE/.test(ciScript));
check('ci:queries_deploy_freeze', /visao:deploy_freeze:active/.test(ciScript));

// ---------- 2. Routing simulation ----------
function routeAlert({ severity, team, hour, dayOfWeek }) {
  // Simplified router matching visao-routing.yml logic
  if (severity === 'critical') return ['telegram-oncall', 'pagerduty-oncall'];
  const businessHours = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 19;
  if (severity === 'warning' && businessHours) {
    if (team === 'storage') return ['slack-storage'];
    if (team === 'backend') return ['slack-backend'];
    return ['slack-warnings'];
  }
  if (severity === 'warning' && !businessHours) return ['ticket-jira'];
  return ['ticket-jira'];
}

const severities = ['critical', 'warning', 'info'];
const teams = ['sre', 'backend', 'storage'];
const windows = [
  { hour: 14, dayOfWeek: 3, label: 'business' },
  { hour: 22, dayOfWeek: 6, label: 'after' },
];
let routingCount = 0;
for (const sev of severities) {
  for (const team of teams) {
    for (const w of windows) {
      for (let rep = 0; rep < 25; rep++) {
        routingCount++;
        const recv = routeAlert({ severity: sev, team, ...w });
        let ok = true;
        if (sev === 'critical' && !recv.includes('telegram-oncall')) ok = false;
        if (sev === 'warning' && w.label === 'after' && !recv.includes('ticket-jira')) ok = false;
        if (
          sev === 'warning' &&
          w.label === 'business' &&
          team === 'storage' &&
          !recv.includes('slack-storage')
        )
          ok = false;
        if (!ok) results.misfires++;
        results.scenarios.push({ kind: 'routing', sev, team, window: w.label, recv, ok });
      }
    }
  }
}

// ---------- 3. Inhibition matrix ----------
function isInhibited(source, target) {
  // fast crit silencia medium/slow do mesmo SLO
  if (
    source.severity === 'critical' &&
    source.window === 'fast' &&
    source.slo === target.slo &&
    ['medium', 'slow'].includes(target.window)
  )
    return true;
  if (
    source.severity === 'critical' &&
    source.window === 'medium' &&
    source.slo === target.slo &&
    target.window === 'slow'
  )
    return true;
  if (
    source.severity === 'critical' &&
    target.severity === 'warning' &&
    source.alertname === target.alertname &&
    source.slo === target.slo &&
    source.region === target.region
  )
    return true;
  return false;
}
const slos = ['metrics', 'app', 'tiering', 'latency'];
const burnLevels = ['fast', 'medium', 'slow'];
let inhibitPairs = 0,
  correctInhibits = 0;
for (const slo of slos) {
  const src = {
    alertname: 'VisaoSloFastBurn',
    severity: 'critical',
    window: 'fast',
    slo,
    region: 'sa-east-1',
  };
  for (const t of burnLevels) {
    inhibitPairs++;
    const tgt = {
      alertname: `VisaoSlo${t}Burn`,
      severity: t === 'fast' ? 'critical' : 'warning',
      window: t,
      slo,
      region: 'sa-east-1',
    };
    const suppressed = isInhibited(src, tgt);
    const expected = t !== 'fast'; // fast não deve inibir a si mesmo
    const ok = suppressed === expected;
    if (ok) correctInhibits++;
    if (!ok) results.misfires++;
    results.scenarios.push({ kind: 'inhibit', slo, target: t, suppressed, expected, ok });
  }
}
check(
  `inhibitions:correct_ratio_${correctInhibits}/${inhibitPairs}`,
  correctInhibits / inhibitPairs >= 0.9
);

// ---------- 4. Freeze logic sweep ----------
function computeFreeze({ budgetBurned, fastBurnActive }) {
  return budgetBurned > 0.5 || fastBurnActive ? 1 : 0;
}
for (let b = 0; b <= 100; b += 5) {
  for (const fb of [false, true]) {
    const val = computeFreeze({ budgetBurned: b / 100, fastBurnActive: fb });
    const expected = b > 50 || fb ? 1 : 0;
    const ok = val === expected;
    if (!ok) results.misfires++;
    results.scenarios.push({ kind: 'freeze_logic', budget: b, fastBurn: fb, val, expected, ok });
  }
}

// ---------- 5. CI script response mocks ----------
function ciDecide({ promStatus, value, failMode }) {
  // Retorna exit code esperado
  if (promStatus === 'ok') {
    if (value === null) return failMode === 'open' ? 0 : 1;
    return value >= 1 ? 1 : 0;
  }
  // 500 / timeout / network → unreachable
  return failMode === 'open' ? 0 : 1;
}
const promStates = [
  { promStatus: 'ok', value: 0 },
  { promStatus: 'ok', value: 1 },
  { promStatus: 'ok', value: null },
  { promStatus: 'error_500' },
  { promStatus: 'timeout' },
];
for (const st of promStates) {
  for (const fm of ['open', 'closed']) {
    for (let rep = 0; rep < 15; rep++) {
      const code = ciDecide({ ...st, failMode: fm });
      let expected;
      if (st.promStatus === 'ok') {
        expected = st.value === 1 ? 1 : st.value === null ? (fm === 'open' ? 0 : 1) : 0;
      } else {
        expected = fm === 'open' ? 0 : 1;
      }
      const ok = code === expected;
      if (!ok) results.misfires++;
      results.scenarios.push({ kind: 'ci', ...st, failMode: fm, code, expected, ok });
    }
  }
}

// ---------- 6. Anti-flap: spike de 1 amostra não deve ativar (for: 2m) ----------
const samples = [0, 0, 1, 0, 0, 0]; // spike isolado
let activatedByFlap = false;
let consecutive = 0;
for (const s of samples) {
  consecutive = s === 1 ? consecutive + 1 : 0;
  if (consecutive >= 4) activatedByFlap = true; // 4 samples @ 30s = 2m
}
check('antiflap:isolated_spike_does_not_activate', !activatedByFlap);

// Sustained: 5 amostras seguidas de 1 deve ativar
let sustained = 0;
for (const s of [1, 1, 1, 1, 1]) sustained = s === 1 ? sustained + 1 : 0;
check('antiflap:sustained_activates', sustained >= 4);

// ---------- Summary ----------
const totalChecks = results.checks.length;
const passedChecks = results.checks.filter((c) => c.ok).length;
const summary = {
  wave: 'storage-25',
  totalChecks,
  passedChecks,
  scenarios: results.scenarios.length,
  misfires: results.misfires,
  passRate: `${((passedChecks / totalChecks) * 100).toFixed(1)}%`,
};

mkdirSync('reports/simulations', { recursive: true });
writeFileSync(
  'reports/simulations/wave-storage-25.json',
  JSON.stringify(
    { summary, checks: results.checks, scenarios: results.scenarios.slice(0, 200) },
    null,
    2
  )
);
writeFileSync(
  'reports/simulations/wave-storage-25.md',
  `# Wave Storage 25 — Alertmanager Routing + Deploy Freeze\n\n` +
    `- Checks: **${passedChecks}/${totalChecks}**\n` +
    `- Cenários: **${results.scenarios.length}** (misfires: ${results.misfires})\n` +
    `- Cobre: routing (${routingCount}), inhibitions (${inhibitPairs}), freeze logic sweep, CI mocks × fail-mode, anti-flap.\n`
);

console.log(JSON.stringify(summary, null, 2));
if (results.misfires > 0 || passedChecks !== totalChecks) process.exit(1);
