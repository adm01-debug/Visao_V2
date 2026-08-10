#!/usr/bin/env node
/**
 * VISÃO — Wave Storage 26: Alertmanager Silence integration simulation.
 * Exercises the pure validators (matchers, duration, from-alert derivation)
 * across hundreds of adversarial scenarios and asserts anti-abuse invariants.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_JSON = resolve(ROOT, 'reports/simulations/wave-storage-26.json');
const OUT_MD = resolve(ROOT, 'reports/simulations/wave-storage-26.md');

// Import pure helpers by transpiling on the fly via a tiny CJS shim.
// The edge function uses Deno-only APIs (Deno.serve), so we extract the pure
// helpers via regex + eval into a sandbox. This keeps the simulator hermetic.
import { readFileSync } from 'node:fs';
const src = readFileSync(resolve(ROOT, 'supabase/functions/alertmanager-silence/index.ts'), 'utf8');

function extractFn(name) {
  const re = new RegExp(`export function ${name}[\\s\\S]*?\\n\\}\\n`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`function ${name} not found`);
  return m[0].replace(/^export /, '');
}

const helpersJs = [
  'const MIN_MINUTES=5,MAX_MINUTES=1440,DEFAULT_MINUTES=60,MAX_MATCHERS=12;',
  'const NAME_RE=/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;',
  "const MATCH_EVERYTHING_VALUES=new Set(['','.*','.+','.*?','^.*$']);",
  extractFn('validateMatchers')
    .replace(/:\s*\{[^}]*\}\s*\|\s*\{[^}]*\}/, '')
    .replace(/:\s*Matcher\[\]/g, '')
    .replace(/:\s*unknown/g, '')
    .replace(/as Record<string, unknown>/g, '')
    .replace(/as Matcher/g, '')
    .replace(/Matcher\[\]/g, 'Array'),
  extractFn('clampDurationMinutes')
    .replace(/:\s*unknown/g, '')
    .replace(/:\s*number/g, ''),
  extractFn('buildMatchersFromAlert')
    .replace(/:\s*\{[\s\S]*?\}\s*\)/, ')')
    .replace(/:\s*Matcher\[\]/g, '')
    .replace(/as Record<string, unknown>/g, ''),
  'module.exports={validateMatchers,clampDurationMinutes,buildMatchersFromAlert};',
].join('\n');

const tmp = resolve(ROOT, 'reports/simulations/_wave26_helpers.cjs');
mkdirSync(dirname(tmp), { recursive: true });
writeFileSync(tmp, helpersJs);
const { validateMatchers, clampDurationMinutes, buildMatchersFromAlert } = await import(
  pathToFileURL(tmp).href
);

const results = { checks: [], scenarios: [], summary: {} };
const check = (name, cond, extra = {}) => {
  results.checks.push({ name, ok: !!cond, ...extra });
  if (!cond) console.error('✗', name, extra);
};

// ---------- Structural checks ----------
check(
  'valid matcher accepted',
  validateMatchers([{ name: 'alertname', value: 'VisaoSloFastBurn' }]).ok === true
);
check('empty matchers rejected', validateMatchers([]).ok === false);
check(
  'too many matchers rejected',
  validateMatchers(Array.from({ length: 13 }, (_, i) => ({ name: `l${i}`, value: 'x' }))).ok ===
    false
);
check(
  'match everything (.*)  rejected',
  validateMatchers([{ name: 'alertname', value: '.*', isRegex: true }]).ok === false
);
check(
  'match everything (empty regex) rejected',
  validateMatchers([{ name: 'alertname', value: '', isRegex: true }]).ok === false
);
check(
  'invalid regex rejected',
  validateMatchers([{ name: 'alertname', value: '(unbalanced', isRegex: true }]).ok === false
);
check('invalid label name rejected', validateMatchers([{ name: '9bad', value: 'x' }]).ok === false);
check('duration below min clamped up', clampDurationMinutes(1) === 5);
check('duration above max clamped down', clampDurationMinutes(99999) === 1440);
check('duration NaN → default', clampDurationMinutes('abc') === 60);
check('duration negative → default', clampDurationMinutes(-1) === 60);
check(
  'from_alert derives alertname+labels',
  buildMatchersFromAlert({ alertname: 'X', labels: { severity: 'critical', region: 'us-east-1' } })
    .length === 3
);
check(
  'from_alert skips instance label',
  buildMatchersFromAlert({
    alertname: 'X',
    labels: { instance: 'host:9100', severity: 'crit' },
  }).every((m) => m.name !== 'instance')
);
check(
  'from_alert caps at MAX_MATCHERS',
  buildMatchersFromAlert({
    alertname: 'X',
    labels: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`lbl${i}`, 'v'])),
  }).length <= 12
);
check(
  'from_alert drops non-string label values',
  buildMatchersFromAlert({ alertname: 'X', labels: { severity: 123, ok: 'y' } }).filter(
    (m) => m.name === 'severity'
  ).length === 0
);

// ---------- Scenario sweep ----------
const rand = (n) => Math.floor(Math.random() * n);
const NAMES = ['alertname', 'severity', 'region', 'team', 'slo', 'burn_rate_window', 'service'];
const VALUES = [
  'critical',
  'warning',
  'us-east-1',
  'eu-west-1',
  'storage',
  'visao-metrics',
  'fast',
  'medium',
];
const BAD_VALUES = ['.*', '', '.+', '^.*$'];

let misfires = 0;
let derivedFailures = 0;
for (let i = 0; i < 700; i++) {
  const kind = i % 5;
  if (kind === 0) {
    // Valid narrow silence
    const matchers = [
      { name: 'alertname', value: 'VisaoSloFastBurn' },
      { name: NAMES[rand(NAMES.length)], value: VALUES[rand(VALUES.length)] },
    ];
    const r = validateMatchers(matchers);
    if (!r.ok) {
      misfires++;
      results.scenarios.push({ i, kind, ok: false, r });
    }
  } else if (kind === 1) {
    // Regex + narrowing
    const matchers = [
      { name: 'alertname', value: '^Visao.*Burn$', isRegex: true },
      { name: 'severity', value: 'critical' },
    ];
    const r = validateMatchers(matchers);
    if (!r.ok) misfires++;
  } else if (kind === 2) {
    // All matchers are match-everything → must reject
    const matchers = Array.from({ length: 1 + rand(3) }, () => ({
      name: NAMES[rand(NAMES.length)],
      value: BAD_VALUES[rand(BAD_VALUES.length)],
      isRegex: true,
    }));
    const r = validateMatchers(matchers);
    if (r.ok) {
      misfires++;
      results.scenarios.push({ i, kind, ok: false, matchers });
    }
  } else if (kind === 3) {
    // from_alert with mixed labels
    const labels = { severity: 'warning', region: 'sa-east-1', instance: 'x:9100' };
    const derived = buildMatchersFromAlert({ alertname: `Alert_${i}`, labels });
    if (derived.some((m) => m.name === 'instance')) derivedFailures++;
    const r = validateMatchers(derived);
    if (!r.ok) derivedFailures++;
  } else {
    // Duration boundary sweep
    const inputs = [-99, 0, 1, 4, 5, 60, 1439, 1440, 1441, 99999, 'nan', null, undefined];
    for (const v of inputs) {
      const d = clampDurationMinutes(v);
      if (d < 5 || d > 1440) misfires++;
    }
  }
}

check('zero misfires across scenario sweep', misfires === 0, { misfires });
check('from_alert derivations always valid', derivedFailures === 0, { derivedFailures });

// ---------- Summary ----------
const passed = results.checks.filter((c) => c.ok).length;
const total = results.checks.length;
results.summary = {
  wave: 'storage-26',
  passed,
  total,
  scenarios_run: 700,
  misfires,
  derived_failures: derivedFailures,
  timestamp: new Date().toISOString(),
};

writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
writeFileSync(
  OUT_MD,
  `# Wave Storage 26 — Simulation Report

- Structural checks: **${passed}/${total}**
- Scenarios executed: **700**
- Misfires: **${misfires}**
- Derived-matcher failures: **${derivedFailures}**
- Timestamp: ${results.summary.timestamp}

## Invariants validated
1. Silences que casariam com todos alertas (\`.*\`, vazio) são recusados.
2. Duração é sempre clamped em [5, 1440] minutos.
3. Máx. 12 matchers por silence.
4. \`from_alert\` nunca inclui \`instance\` (evita silence excessivamente estreito por host).
5. Regex inválida é rejeitada antes de chegar ao Alertmanager.
6. Nomes de label seguem \`[a-zA-Z_][a-zA-Z0-9_]{0,63}\`.
`
);

console.log(
  `Wave 26 simulation: ${passed}/${total} checks · misfires=${misfires} · derived_failures=${derivedFailures}`
);
if (passed !== total || misfires > 0 || derivedFailures > 0) process.exit(1);
