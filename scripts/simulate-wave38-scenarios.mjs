// Wave 38 — Simulação: badge de crons stale (renderização + contagem).
import { mkdirSync, writeFileSync } from 'node:fs';

function badge({ isAdmin, loading, health }) {
  if (!isAdmin || loading || !health) return null;
  const stale = health.filter((r) => r.status === 'stale');
  if (stale.length === 0) return null;
  const label = `${stale.length} ${stale.length === 1 ? 'cron atrasado' : 'crons atrasados'}`;
  return { count: stale.length, label };
}

const cases = [
  { name: 'não-admin', input: { isAdmin: false, loading: false, health: [] }, expect: null },
  { name: 'loading', input: { isAdmin: true, loading: true, health: [] }, expect: null },
  {
    name: 'saudável',
    input: { isAdmin: true, loading: false, health: [{ status: 'on_time' }] },
    expect: null,
  },
  {
    name: '1 stale singular',
    input: { isAdmin: true, loading: false, health: [{ status: 'stale' }] },
    expect: { count: 1, label: '1 cron atrasado' },
  },
  {
    name: '3 stale plural',
    input: { isAdmin: true, loading: false, health: Array(3).fill({ status: 'stale' }) },
    expect: { count: 3, label: '3 crons atrasados' },
  },
  {
    name: 'misto 2/5',
    input: {
      isAdmin: true,
      loading: false,
      health: [
        { status: 'stale' },
        { status: 'on_time' },
        { status: 'stale' },
        { status: 'on_time' },
        { status: 'on_time' },
      ],
    },
    expect: { count: 2, label: '2 crons atrasados' },
  },
];

let pass = 0,
  fail = 0;
const failures = [];
for (const c of cases) {
  const got = badge(c.input);
  const ok = JSON.stringify(got) === JSON.stringify(c.expect);
  ok ? pass++ : (fail++, failures.push({ ...c, got }));
}

// Fuzz 300 cenários aleatórios
for (let i = 0; i < 300; i++) {
  const isAdmin = Math.random() < 0.7;
  const loading = Math.random() < 0.1;
  const n = Math.floor(Math.random() * 8);
  const health = Array.from({ length: n }, () => ({
    status: Math.random() < 0.5 ? 'stale' : 'on_time',
  }));
  const staleN = health.filter((r) => r.status === 'stale').length;
  const got = badge({ isAdmin, loading, health });
  const expected =
    !isAdmin || loading || staleN === 0
      ? null
      : { count: staleN, label: `${staleN} ${staleN === 1 ? 'cron atrasado' : 'crons atrasados'}` };
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  ok ? pass++ : (fail++, failures.push({ i, isAdmin, loading, staleN, got, expected }));
}

mkdirSync('reports/simulations', { recursive: true });
writeFileSync(
  'reports/simulations/wave38.json',
  JSON.stringify(
    { wave: 38, total: pass + fail, pass, fail, failures: failures.slice(0, 10) },
    null,
    2
  )
);
console.log(`wave38: ${pass}/${pass + fail} pass`);
if (fail) process.exit(1);
