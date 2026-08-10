// Wave 36 — Simulação: dedup via sessionStorage + revive em nova execução.
import { mkdirSync, writeFileSync } from 'node:fs';

const scenarios = [];
let pass = 0;
let fail = 0;

function assess(prevSet, rows) {
  const toasts = [];
  const set = new Set(prevSet);
  for (const r of rows) {
    if (r.status !== 'stale') continue;
    const key = `${r.jobname}::${r.last_run ?? 'never'}`;
    if (set.has(key)) continue;
    set.add(key);
    toasts.push(r.jobname);
  }
  return { toasts, set };
}

// 1) Cenários determinísticos
const base = {
  jobname: 'visao-daily-retention',
  schedule: '30 3 * * *',
  status: 'stale',
  last_run: '2026-07-10T03:30:00Z',
};
const remounts = 20;
{
  let set = new Set();
  let totalToasts = 0;
  for (let i = 0; i < remounts; i++) {
    const { toasts, set: next } = assess(set, [base]);
    totalToasts += toasts.length;
    set = next;
  }
  const ok = totalToasts === 1;
  scenarios.push({ name: '20 remounts, mesmo last_run', totalToasts, expected: 1, ok });
  ok ? pass++ : fail++;
}

// 2) Nova execução muda last_run — deve reemitir
{
  let set = new Set();
  const { set: after1, toasts: t1 } = assess(set, [base]);
  const base2 = { ...base, last_run: '2026-07-14T03:30:00Z' };
  const { toasts: t2 } = assess(after1, [base2]);
  const ok = t1.length === 1 && t2.length === 1;
  scenarios.push({ name: 'nova execução ainda stale', t1: t1.length, t2: t2.length, ok });
  ok ? pass++ : fail++;
}

// 3) Fuzz 200 sequências aleatórias
const rand = (n) => Math.floor(Math.random() * n);
for (let i = 0; i < 200; i++) {
  let set = new Set();
  const distinctKeys = new Set();
  const emitted = [];
  const ticks = 3 + rand(8);
  for (let t = 0; t < ticks; t++) {
    const rows = [];
    const jobs = 1 + rand(4);
    for (let j = 0; j < jobs; j++) {
      const status = Math.random() < 0.6 ? 'stale' : 'on_time';
      const last_run = `2026-07-${10 + rand(5)}T00:00:00Z`;
      const jobname = `visao-job-${j}`;
      rows.push({ jobname, schedule: '* * * * *', status, last_run });
      if (status === 'stale') distinctKeys.add(`${jobname}::${last_run}`);
    }
    const { toasts, set: next } = assess(set, rows);
    emitted.push(...toasts);
    set = next;
  }
  // Nº de toasts = Nº de chaves distintas stale encontradas
  const ok = emitted.length === distinctKeys.size;
  if (!ok)
    scenarios.push({ name: `fuzz-${i}`, emitted: emitted.length, expected: distinctKeys.size, ok });
  ok ? pass++ : fail++;
}

mkdirSync('reports/simulations', { recursive: true });
writeFileSync(
  'reports/simulations/wave36.json',
  JSON.stringify(
    { wave: 36, total: pass + fail, pass, fail, scenarios: scenarios.slice(0, 20) },
    null,
    2
  )
);
console.log(`wave36: ${pass}/${pass + fail} pass`);
if (fail) process.exit(1);
