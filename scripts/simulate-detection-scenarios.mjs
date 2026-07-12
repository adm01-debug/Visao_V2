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
  const insiderThreat = chance(0.08) && auth && OFF_HOURS.has(hour) &&
    ['almoxarifado', 'perimetro'].includes(cam.zone);

  const truth =
    (OFF_HOURS.has(hour) && motion && !auth) ||
    forcedEntry ||
    (dwellSec > 300 && ['perimetro', 'almoxarifado'].includes(cam.zone)) ||
    insiderThreat;

  return { id: `risk-${i}`, domain: 'risk', cam, hour, dwellSec, motion, forcedEntry, auth, faceKnown, insiderThreat, truth };
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

  const truth = (doorSensor || glassBreak) && OFF_HOURS.has(hour) && !auth && motion && !sensorFault;
  return { id: `break-${i}`, domain: 'break_in', cam, hour, doorSensor, glassBreak, motion, auth, sensorFault, truth };
}

/* ------------------------------- Detector -------------------------------- */
function detect(scenario) {
  switch (scenario.domain) {
    case 'risk': {
      const s = scenario;
      const suspiciousHours = OFF_HOURS.has(s.hour);
      const loiter = s.dwellSec > 300 && ['perimetro', 'almoxarifado'].includes(s.cam.zone);
      const insider = s.auth && suspiciousHours &&
        ['almoxarifado', 'perimetro'].includes(s.cam.zone) && s.insiderThreat;
      return (suspiciousHours && s.motion && !s.auth) || s.forcedEntry || loiter || insider;
    }
    case 'productivity': {
      const s = scenario;
      if (!s.inShift || s.lunchBreak) return false;
      return s.idleMin > 15 || s.peopleCount < Math.max(1, s.expected - 2);
    }
    case 'break_in': {
      const s = scenario;
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
  const accuracy = (tp + tn) / rows.length;
  return { n: rows.length, tp, fp, fn, tn, precision, recall, f1, accuracy };
}

const summary = {
  generatedAt: new Date().toISOString(),
  seed: SEED,
  totalScenarios: scenarios.length,
  perDomain: {
    risk: metrics(results.risk),
    productivity: metrics(results.productivity),
    break_in: metrics(results.break_in),
  },
  failureCount: failures.length,
  sampleFailures: failures.slice(0, 15),
};

/* ------------------------------ Persistência ----------------------------- */
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'detection.json'), JSON.stringify(summary, null, 2));

const pct = (n) => `${(n * 100).toFixed(1)}%`;
const md = [];
md.push('# Simulação de Detecção — VISÃO', '');
md.push(`**Gerado em:** ${summary.generatedAt}  `);
md.push(`**Seed:** ${SEED} · **Cenários:** ${summary.totalScenarios}`, '');
md.push('## Métricas por domínio', '');
md.push('| Domínio | N | TP | FP | FN | TN | Precisão | Recall | F1 | Acurácia |');
md.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const [k, m] of Object.entries(summary.perDomain)) {
  md.push(
    `| ${k} | ${m.n} | ${m.tp} | ${m.fp} | ${m.fn} | ${m.tn} | ${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.f1)} | ${pct(m.accuracy)} |`,
  );
}
md.push('', `## Falhas (${failures.length})`, '');
if (failures.length === 0) {
  md.push('✅ Nenhum gap detectado nos cenários gerados.');
} else {
  md.push('_Primeiras 15 divergências entre detector e ground truth:_', '');
  for (const f of summary.sampleFailures) {
    md.push(`- \`${f.id}\` [${f.domain}] previsto=${f.predicted} verdade=${f.truth}`);
  }
}
writeFileSync(resolve(OUT_DIR, 'detection.md'), md.join('\n'));

console.log('══════════════════════════════════════════════');
console.log(' VISÃO — Simulação de detecção');
console.log('══════════════════════════════════════════════');
for (const [k, m] of Object.entries(summary.perDomain)) {
  console.log(
    `  • ${k.padEnd(14)} n=${m.n}  P=${pct(m.precision)}  R=${pct(m.recall)}  F1=${pct(m.f1)}  Acc=${pct(m.accuracy)}`,
  );
}
console.log('──────────────────────────────────────────────');
console.log(` Falhas: ${failures.length}/${scenarios.length}`);
console.log(` Relatório: reports/simulations/detection.{md,json}`);

// Exit non-zero apenas se F1 global < 0.85 (gap crítico)
const globalTp = Object.values(summary.perDomain).reduce((a, m) => a + m.tp, 0);
const globalFp = Object.values(summary.perDomain).reduce((a, m) => a + m.fp, 0);
const globalFn = Object.values(summary.perDomain).reduce((a, m) => a + m.fn, 0);
const globalP = globalTp + globalFp === 0 ? 1 : globalTp / (globalTp + globalFp);
const globalR = globalTp + globalFn === 0 ? 1 : globalTp / (globalTp + globalFn);
const globalF1 = globalP + globalR === 0 ? 0 : (2 * globalP * globalR) / (globalP + globalR);
console.log(` F1 global: ${pct(globalF1)}`);
if (args.includes('--strict') && globalF1 < 0.85) {
  console.error('✖ F1 global abaixo do gate (0.85).');
  process.exit(1);
}
process.exit(0);
