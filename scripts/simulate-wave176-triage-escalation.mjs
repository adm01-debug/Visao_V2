/**
 * Onda 176 — simulação do escalonamento de prazo vencido.
 * Executa centenas de milhares de asserções sobre as 7 regras invioláveis.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wave176-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export * from '${join(process.cwd(), 'src/lib/emap/triageEscalation.ts').replace(/\\\\/g, '/')}';`,
);
const out = join(dir, 'bundle.mjs');
execSync(`npx esbuild ${entry} --bundle --format=esm --platform=node --outfile=${out} --log-level=error`, {
  stdio: 'inherit',
});
const mod = await import(`file://${out}`);
const {
  escalationLevelFor,
  reconcileEscalations,
  summarizeEscalations,
  escalationRank,
  DEFAULT_ESCALATION_POLICY,
} = mod;

let asserts = 0;
let failures = 0;
const check = (cond, msg) => {
  asserts += 1;
  if (!cond) {
    failures += 1;
    if (failures <= 10) console.error('FALHA:', msg);
  }
};

const verdict = (over) => ({
  cameraId: 'cam-1',
  state: over > 0 ? 'breached' : 'on_time',
  budgetMs: 120000,
  budgetStatus: 'alert',
  startedAt: 1000,
  dueAt: 121000,
  elapsedMs: 120000 + Math.max(over, 0),
  remainingMs: 0,
  overdueMs: Math.max(over, 0),
  frozen: false,
  frozenAt: null,
});

// Regra 2 — degrau pelo múltiplo do orçamento.
for (let over = 0; over <= 600000; over += 137) {
  const level = escalationLevelFor(verdict(over));
  const ratio = over / 120000;
  const expected =
    over <= 0 ? 'none' : ratio >= 3 ? 'management' : ratio >= 1 ? 'supervisor' : 'operator';
  check(level === expected, `ratio ${ratio} -> ${level} (esperado ${expected})`);
}

// Regra 1 — congelado/ não vencido nunca escalona.
for (const state of ['met', 'late', 'on_time', 'due_soon', 'not_applicable']) {
  const v = { ...verdict(999999), state };
  check(escalationLevelFor(v) === 'none', `estado ${state} não deve escalonar`);
}
check(escalationLevelFor({ ...verdict(999999), frozen: true }) === 'none', 'frozen não escalona');
check(escalationLevelFor(null) === 'none', 'null -> none');
check(escalationLevelFor(undefined) === 'none', 'undefined -> none');
check(escalationLevelFor({ ...verdict(9999), budgetMs: null }) === 'none', 'sem orçamento -> none');

// Regra 3 + 5 — monotonia e emissão única por degrau.
{
  let memory = {};
  let lastLevel = 'none';
  let emissions = 0;
  for (let t = 0; t <= 900000; t += 1000) {
    const over = t;
    const res = reconcileEscalations({ verdicts: [verdict(over)], memory, now: 10_000 + t });
    memory = res.memory;
    const rec = memory['cam-1'];
    const level = rec ? rec.level : 'none';
    check(escalationRank(level) >= escalationRank(lastLevel), 'degrau nunca retrocede');
    check(res.transitions.length === (level !== lastLevel ? 1 : 0), 'transição só na subida');
    emissions += res.transitions.length;
    lastLevel = level;
  }
  check(emissions === 3, `3 subidas esperadas, obtidas ${emissions}`);

  // Melhora do estado (orçamento maior) não rebaixa.
  const softer = { ...verdict(600000), budgetMs: 900000, budgetStatus: 'unknown', overdueMs: 1000 };
  const res = reconcileEscalations({ verdicts: [softer], memory, now: 2_000_000 });
  check(res.memory['cam-1'].level === 'management', 'melhora não rebaixa degrau');
  check(res.transitions.length === 0, 'melhora não reemite');
}

// Regra 4 — janela nova zera memória.
{
  const memory = { 'cam-1': { cameraId: 'cam-1', openedAt: 1000, level: 'management', at: 5 } };
  const fresh = { ...verdict(1000), startedAt: 50_000 };
  const res = reconcileEscalations({ verdicts: [fresh], memory, now: 60_000 });
  check(res.memory['cam-1'].level === 'operator', 'janela nova reinicia degrau');
  check(res.transitions[0].from === 'none', 'transição parte de none em janela nova');
}

// Regra 6 — relógio para trás.
{
  const v = { ...verdict(0), state: 'breached', overdueMs: 0 };
  const res = reconcileEscalations({ verdicts: [v], memory: {}, now: 0 });
  check(Object.keys(res.memory).length === 0, 'sem atraso medido, sem registro');
}

// Regra 7 — imutabilidade da memória recebida.
{
  const memory = Object.freeze({
    'cam-1': Object.freeze({ cameraId: 'cam-1', openedAt: 1000, level: 'operator', at: 1 }),
  });
  const res = reconcileEscalations({ verdicts: [verdict(200000)], memory, now: 9 });
  check(memory['cam-1'].level === 'operator', 'memória de entrada intacta');
  check(res.memory !== memory, 'memória devolvida é nova');
}

// Fuzz determinístico multi-câmera.
let seed = 987654321;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
for (let run = 0; run < 4000; run += 1) {
  const n = 1 + Math.floor(rnd() * 6);
  let memory = {};
  let prev = {};
  for (let step = 0; step < 12; step += 1) {
    const now = 10_000 + step * 5000;
    const verdicts = [];
    for (let i = 0; i < n; i += 1) {
      const budget = [120000, 300000, 600000, 900000][Math.floor(rnd() * 4)];
      const over = Math.floor(rnd() * budget * 4) - budget;
      const frozen = rnd() < 0.15;
      verdicts.push({
        cameraId: `cam-${i}`,
        state: frozen ? (over > 0 ? 'late' : 'met') : over > 0 ? 'breached' : 'on_time',
        budgetMs: budget,
        budgetStatus: 'alert',
        startedAt: 1000 + i,
        dueAt: 1000 + i + budget,
        elapsedMs: budget + Math.max(over, 0),
        remainingMs: Math.max(-over, 0),
        overdueMs: Math.max(over, 0),
        frozen,
        frozenAt: frozen ? now : null,
      });
    }
    const res = reconcileEscalations({ verdicts, memory, now });
    for (const [id, rec] of Object.entries(res.memory)) {
      const before = prev[id];
      if (before && before.openedAt === rec.openedAt) {
        check(escalationRank(rec.level) >= escalationRank(before.level), 'monotonia no fuzz');
      }
      check(rec.level !== 'none', 'livro não guarda none');
    }
    for (const tr of res.transitions) {
      check(escalationRank(tr.to) > escalationRank(tr.from), 'transição sempre sobe');
      check(res.memory[tr.cameraId].at === now, 'carimbo da subida é agora');
    }
    const sum = summarizeEscalations(res.memory);
    check(sum.total === Object.keys(res.memory).length, 'total do resumo bate');
    check(
      sum.total === sum.byLevel.operator + sum.byLevel.supervisor + sum.byLevel.management,
      'soma por degrau bate',
    );
    prev = res.memory;
    memory = res.memory;
  }
}

rmSync(dir, { recursive: true, force: true });
console.log(`\nOnda 176 — asserções: ${asserts} | falhas: ${failures}`);
if (failures > 0) process.exit(1);
