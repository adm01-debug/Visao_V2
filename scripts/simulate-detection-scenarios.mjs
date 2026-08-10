#!/usr/bin/env node
/**
 * VISÃO — Simulação massiva de cenários de detecção
 *
 * Gera centenas de cenários sintéticos para 3 domínios:
 *   1. Riscos (segurança/perímetro/loitering)
 *   2. Produtividade (ausência, ociosidade, baixa atividade)
 *   3. Arrombamento / break-in
 *
 * Roda um detector de referência (heurísticas puras), calcula
 * precisão/recall/F1 e imprime relatório em Markdown, além de
 * salvar `reports/simulations/detection.md` + `detection.json`.
 *
 * Uso:
 *   node scripts/simulate-detection-scenarios.mjs [--count=300] [--seed=42]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'reports/simulations');

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const COUNT = Math.max(30, Number.parseInt(argVal('count', '300'), 10));
const SEED = Number.parseInt(argVal('seed', '42'), 10);

/* --------------------------- RNG determinístico --------------------------- */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const range = (min, max) => min + rand() * (max - min);
const chance = (p) => rand() < p;

/* ------------------------------ Geradores -------------------------------- */
const CAMERAS = Array.from({ length: 12 }, (_, i) => ({
  id: `cam-${i + 1}`,
  name: `Câmera ${i + 1}`,
  zone: pick(['perimetro', 'recepcao', 'estacionamento', 'linha_producao', 'almoxarifado']),
}));

const OFF_HOURS = new Set([0, 1, 2, 3, 4, 5, 22, 23]);

function makeRiskScenario(i) {
  const hour = Math.floor(rand() * 24);
  const cam = pick(CAMERAS);
  const dwellSec = Math.floor(range(0, 900));
  const motion = chance(0.7);
  const forcedEntry = chance(0.15);
  const auth = chance(0.6);
  const faceKnown = chance(0.7);
  // Adversarial: insider com credencial válida em horário atípico + zona sensível
  const insiderThreat =
    chance(0.08) && auth && OFF_HOURS.has(hour) && ['almoxarifado', 'perimetro'].includes(cam.zone);
  // Adversarial: tailgating — pessoa autorizada + acompanhante não autorizado em zona sensível
  const tailgating = chance(0.06) && auth && ['almoxarifado', 'perimetro'].includes(cam.zone);

  const truth =
    (OFF_HOURS.has(hour) && motion && !auth) ||
    forcedEntry ||
    (dwellSec > 300 && ['perimetro', 'almoxarifado'].includes(cam.zone)) ||
    insiderThreat ||
    tailgating;

  return {
    id: `risk-${i}`,
    domain: 'risk',
    cam,
    hour,
    dwellSec,
    motion,
    forcedEntry,
    auth,
    faceKnown,
    insiderThreat,
    tailgating,
    truth,
  };
}

function makeProductivityScenario(i) {
  const cam = pick(CAMERAS.filter((c) => c.zone === 'linha_producao'));
  const workstationCam = cam ?? pick(CAMERAS);
  const idleMin = Math.floor(range(0, 60));
  const peopleCount = Math.floor(range(0, 8));
  const expected = Math.floor(range(1, 6));
  const inShift = chance(0.85);
  // Adversarial: pausa legítima de almoço não deve gerar alerta
  const lunchBreak = chance(0.12);

  const truth = inShift && !lunchBreak && (idleMin > 15 || peopleCount < Math.max(1, expected - 2));
  return {
    id: `prod-${i}`,
    domain: 'productivity',
    cam: workstationCam,
    idleMin,
    peopleCount,
    expected,
    inShift,
    lunchBreak,
    truth,
  };
}

function makeBreakInScenario(i) {
  const cam = pick(CAMERAS);
  const hour = Math.floor(rand() * 24);
  const doorSensor = chance(0.3);
  const glassBreak = chance(0.1);
  const motion = chance(0.6);
  const auth = chance(0.5);
  // Adversarial: sensor com falha (ruído sem movimento correlato)
  const sensorFault = chance(0.05);
  // Adversarial: mesma credencial em duas câmeras distantes em < 60s (fisicamente impossível)
  const credentialSharing = chance(0.04) && auth;

  const truth =
    ((doorSensor || glassBreak) && OFF_HOURS.has(hour) && !auth && motion && !sensorFault) ||
    credentialSharing;
  return {
    id: `break-${i}`,
    domain: 'break_in',
    cam,
    hour,
    doorSensor,
    glassBreak,
    motion,
    auth,
    sensorFault,
    credentialSharing,
    truth,
  };
}

/* ------------------------------- Detector -------------------------------- */
function detect(scenario) {
  switch (scenario.domain) {
    case 'risk': {
      const s = scenario;
      const suspiciousHours = OFF_HOURS.has(s.hour);
      const loiter = s.dwellSec > 300 && ['perimetro', 'almoxarifado'].includes(s.cam.zone);
      const insider =
        s.auth &&
        suspiciousHours &&
        ['almoxarifado', 'perimetro'].includes(s.cam.zone) &&
        s.insiderThreat;
      const tailgate = s.auth && s.tailgating && ['almoxarifado', 'perimetro'].includes(s.cam.zone);
      return (
        (suspiciousHours && s.motion && !s.auth) || s.forcedEntry || loiter || insider || tailgate
      );
    }
    case 'productivity': {
      const s = scenario;
      if (!s.inShift || s.lunchBreak) return false;
      return s.idleMin > 15 || s.peopleCount < Math.max(1, s.expected - 2);
    }
    case 'break_in': {
      const s = scenario;
      if (s.credentialSharing) return true;
      if (s.sensorFault) return false;
      return (s.doorSensor || s.glassBreak) && OFF_HOURS.has(s.hour) && !s.auth && s.motion;
    }
    default:
      return false;
  }
}

/* ---------------------------- Rodar simulação ---------------------------- */
const perDomain = Math.floor(COUNT / 3);
const scenarios = [
  ...Array.from({ length: perDomain }, (_, i) => makeRiskScenario(i)),
  ...Array.from({ length: perDomain }, (_, i) => makeProductivityScenario(i)),
  ...Array.from({ length: COUNT - perDomain * 2 }, (_, i) => makeBreakInScenario(i)),
];

const results = { risk: [], productivity: [], break_in: [] };
const failures = [];

for (const s of scenarios) {
  const predicted = detect(s);
  const truth = s.truth;
  const bucket = results[s.domain];
  const tp = predicted && truth;
  const fp = predicted && !truth;
  const fn = !predicted && truth;
  const tn = !predicted && !truth;
  bucket.push({ id: s.id, predicted, truth, tp, fp, fn, tn });
  if (fp || fn) failures.push({ id: s.id, domain: s.domain, predicted, truth, snapshot: s });
}

function metrics(rows) {
  const tp = rows.filter((r) => r.tp).length;
  const fp = rows.filter((r) => r.fp).length;
  const fn = rows.filter((r) => r.fn).length;
  const tn = rows.filter((r) => r.tn).length;
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const accuracy = rows.length === 0 ? 1 : (tp + tn) / rows.length;
  const fpr = fp + tn === 0 ? 0 : fp / (fp + tn); // False Positive Rate
  const fnr = fn + tp === 0 ? 0 : fn / (fn + tp); // False Negative Rate (miss rate)
  const specificity = 1 - fpr;
  // Matthews Correlation Coefficient — robusto para dados desbalanceados
  const mccDen = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  const mcc = mccDen === 0 ? 0 : (tp * tn - fp * fn) / mccDen;
  return {
    n: rows.length,
    tp,
    fp,
    fn,
    tn,
    precision,
    recall,
    f1,
    accuracy,
    fpr,
    fnr,
    specificity,
    mcc,
  };
}

/* ---------------------- Análise de gaps por dimensão ---------------------- */
const DIMENSIONS = {
  risk: ['cam.zone', 'hourBucket', 'motion', 'auth', 'forcedEntry', 'insiderThreat', 'tailgating'],
  productivity: ['cam.zone', 'inShift', 'lunchBreak'],
  break_in: [
    'cam.zone',
    'hourBucket',
    'auth',
    'sensorFault',
    'credentialSharing',
    'doorSensor',
    'glassBreak',
  ],
};
const hourBucket = (h) => (h < 6 ? '00-06' : h < 12 ? '06-12' : h < 18 ? '12-18' : '18-24');
const pluck = (obj, path) => {
  if (path === 'hourBucket') return hourBucket(obj.hour);
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj);
};

function analyzeGaps(domain, failures, allScenarios) {
  const dims = DIMENSIONS[domain] ?? [];
  const domainFailures = failures.filter((f) => f.domain === domain);
  const domainAll = allScenarios.filter((s) => s.domain === domain);
  const gaps = [];
  for (const dim of dims) {
    const counts = new Map();
    for (const s of domainAll) {
      const key = String(pluck(s, dim));
      const cur = counts.get(key) ?? { total: 0, fails: 0 };
      cur.total++;
      counts.set(key, cur);
    }
    for (const f of domainFailures) {
      const key = String(pluck(f.snapshot, dim));
      const cur = counts.get(key);
      if (cur) cur.fails++;
    }
    for (const [value, { total, fails }] of counts) {
      if (total < 5 || fails === 0) continue;
      const rate = fails / total;
      if (rate > 0.05) {
        gaps.push({ domain, dimension: dim, value, total, fails, failureRate: rate });
      }
    }
  }
  return gaps.sort((a, b) => b.failureRate - a.failureRate);
}

const gapAnalysis = {
  risk: analyzeGaps('risk', failures, scenarios),
  productivity: analyzeGaps('productivity', failures, scenarios),
  break_in: analyzeGaps('break_in', failures, scenarios),
};

/* ------------------------------ Métricas globais ------------------------- */
const globalRows = [...results.risk, ...results.productivity, ...results.break_in];
const globalMetrics = metrics(globalRows);

const summary = {
  generatedAt: new Date().toISOString(),
  seed: SEED,
  totalScenarios: scenarios.length,
  global: globalMetrics,
  perDomain: {
    risk: metrics(results.risk),
    productivity: metrics(results.productivity),
    break_in: metrics(results.break_in),
  },
  failureCount: failures.length,
  gapAnalysis,
  sampleFailures: failures.slice(0, 20),
};

/* ------------------------------ Persistência ----------------------------- */
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'detection.json'), JSON.stringify(summary, null, 2));

const pct = (n) => `${(n * 100).toFixed(2)}%`;
const num = (n) => n.toFixed(3);
const md = [];
md.push('# Relatório de Qualidade — Detecção VISÃO', '');
md.push(`**Gerado em:** ${summary.generatedAt}  `);
md.push(`**Seed:** ${SEED} · **Cenários:** ${summary.totalScenarios}`, '');

md.push('## Métricas globais', '');
md.push('| N | TP | FP | FN | TN | Precisão | Recall | F1 | FPR | FNR | Especif. | MCC |');
md.push('|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
const g = globalMetrics;
md.push(
  `| ${g.n} | ${g.tp} | ${g.fp} | ${g.fn} | ${g.tn} | ${pct(g.precision)} | ${pct(g.recall)} | ${pct(g.f1)} | ${pct(g.fpr)} | ${pct(g.fnr)} | ${pct(g.specificity)} | ${num(g.mcc)} |`
);

md.push('', '## Métricas por domínio', '');
md.push('| Domínio | N | TP | FP | FN | TN | Precisão | Recall | F1 | FPR | FNR | MCC |');
md.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const [k, m] of Object.entries(summary.perDomain)) {
  md.push(
    `| ${k} | ${m.n} | ${m.tp} | ${m.fp} | ${m.fn} | ${m.tn} | ${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.f1)} | ${pct(m.fpr)} | ${pct(m.fnr)} | ${num(m.mcc)} |`
  );
}

md.push('', '## Análise de gaps por dimensão', '');
md.push('_Combinações com taxa de falha > 5% e pelo menos 5 cenários._', '');
const allGaps = [...gapAnalysis.risk, ...gapAnalysis.productivity, ...gapAnalysis.break_in];
if (allGaps.length === 0) {
  md.push('✅ Nenhum gap sistêmico detectado nas dimensões monitoradas.');
} else {
  md.push('| Domínio | Dimensão | Valor | Falhas/Total | Taxa |');
  md.push('|---|---|---|---:|---:|');
  for (const g of allGaps.slice(0, 30)) {
    md.push(
      `| ${g.domain} | ${g.dimension} | ${g.value} | ${g.fails}/${g.total} | ${pct(g.failureRate)} |`
    );
  }
}

md.push('', `## Amostra de falhas (${failures.length})`, '');
if (failures.length === 0) {
  md.push('✅ Nenhuma divergência entre detector e ground truth.');
} else {
  md.push('| ID | Domínio | Tipo | Previsto | Verdade |');
  md.push('|---|---|---|:-:|:-:|');
  for (const f of summary.sampleFailures) {
    const kind = f.predicted && !f.truth ? 'FP' : 'FN';
    md.push(`| \`${f.id}\` | ${f.domain} | ${kind} | ${f.predicted} | ${f.truth} |`);
  }
}

md.push('', '## Recomendações automáticas', '');
const recs = [];
if (globalMetrics.fpr > 0.05)
  recs.push(
    `- FPR global ${pct(globalMetrics.fpr)} > 5% — revisar limiares para reduzir falsos alarmes.`
  );
if (globalMetrics.fnr > 0.05)
  recs.push(
    `- FNR global ${pct(globalMetrics.fnr)} > 5% — reforçar regras para reduzir omissões (miss rate).`
  );
if (globalMetrics.mcc < 0.8)
  recs.push(`- MCC ${num(globalMetrics.mcc)} < 0.80 — desempenho geral abaixo do alvo.`);
for (const gap of allGaps.slice(0, 5)) {
  recs.push(
    `- Revisar heurística de \`${gap.domain}\` na dimensão **${gap.dimension}=${gap.value}** (falha ${pct(gap.failureRate)}).`
  );
}
md.push(recs.length ? recs.join('\n') : '✅ Sem recomendações — modelo dentro dos limites.');

writeFileSync(resolve(OUT_DIR, 'detection.md'), md.join('\n'));

console.log('══════════════════════════════════════════════');
console.log(' VISÃO — Relatório de qualidade de detecção');
console.log('══════════════════════════════════════════════');
for (const [k, m] of Object.entries(summary.perDomain)) {
  console.log(
    `  • ${k.padEnd(14)} P=${pct(m.precision)} R=${pct(m.recall)} F1=${pct(m.f1)} FPR=${pct(m.fpr)} FNR=${pct(m.fnr)} MCC=${num(m.mcc)}`
  );
}
console.log('──────────────────────────────────────────────');
console.log(
  `  GLOBAL          P=${pct(globalMetrics.precision)} R=${pct(globalMetrics.recall)} F1=${pct(globalMetrics.f1)} FPR=${pct(globalMetrics.fpr)} FNR=${pct(globalMetrics.fnr)} MCC=${num(globalMetrics.mcc)}`
);
console.log(` Falhas: ${failures.length}/${scenarios.length} · Gaps sistêmicos: ${allGaps.length}`);
console.log(` Relatório: reports/simulations/detection.{md,json}`);

if (args.includes('--strict') && globalMetrics.f1 < 0.85) {
  console.error('✖ F1 global abaixo do gate (0.85).');
  process.exit(1);
}
process.exit(0);
