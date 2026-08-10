#!/usr/bin/env node
/**
 * Onda 148 — Simulação do filtro por responsável no console de manutenção.
 *
 * Modelo de referência independente da implementação TypeScript. Varre
 * centenas de cenários pseudo-aleatórios (semente fixa = reprodutível) e exige
 * as 6 invariantes do recorte por dono. Se o modelo aqui e o módulo
 * `src/lib/maintenance/ownerFilter.ts` divergirem, o teste unitário quebra.
 *
 * Uso: `npm run sim:wave148`
 */

const OWNERS = ['field_tech', 'network_ops', 'registry_admin', 'platform', 'triage'];
const LABELS = {
  field_tech: 'Técnico de campo',
  network_ops: 'Operação de rede',
  registry_admin: 'Cadastro',
  platform: 'Plataforma',
  triage: 'Triagem',
  unrouted: 'Sem responsável',
};

/* ---------------- gerador determinístico (mulberry32) ---------------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- modelo de referência ---------------- */
const keyOf = (row) => (row.owner === null ? 'unrouted' : row.owner);

function buildBuckets(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    const e = map.get(key) ?? { label: LABELS[key], open: 0, critical: 0, total: 0 };
    e.total += 1;
    if (row.status === 'open') {
      e.open += 1;
      if (row.severity === 'critical') e.critical += 1;
    }
    map.set(key, e);
  }
  const open = rows.filter((r) => r.status === 'open');
  const buckets = [
    {
      key: 'all',
      label: 'Todos',
      open: open.length,
      critical: open.filter((r) => r.severity === 'critical').length,
      total: rows.length,
    },
    ...[...map.entries()].map(([key, e]) => ({ key, ...e })),
  ];
  const rank = (b) => (b.key === 'all' ? -1 : b.key === 'unrouted' ? Number.MAX_SAFE_INTEGER : 0);
  buckets.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.open - a.open ||
      b.total - a.total ||
      a.label.localeCompare(b.label, 'pt-BR')
  );
  return buckets;
}

const resolveFilter = (buckets, selected) =>
  buckets.some((b) => b.key === selected) ? selected : 'all';

const applyFilter = (rows, key) => (key === 'all' ? rows : rows.filter((r) => keyOf(r) === key));

/* ---------------- cenários ---------------- */
function scenario(rand, index) {
  const size = Math.floor(rand() * 24); // 0..23 linhas, inclui listas vazias
  const rows = [];
  for (let i = 0; i < size; i++) {
    const routed = rand() > 0.25;
    rows.push({
      id: `a${index}-${i}`,
      owner: routed ? OWNERS[Math.floor(rand() * OWNERS.length)] : null,
      status: rand() > 0.35 ? 'open' : 'acknowledged',
      severity: rand() > 0.5 ? 'critical' : 'warning',
    });
  }
  return rows;
}

/* ---------------- invariantes ---------------- */
const failures = [];
const fail = (id, msg) => failures.push(`${id}: ${msg}`);

const SCENARIOS = 600;
const rand = rng(148);
let checks = 0;

for (let s = 0; s < SCENARIOS; s++) {
  const rows = scenario(rand, s);
  const buckets = buildBuckets(rows);
  const owned = buckets.filter((b) => b.key !== 'all');

  // I1 — partição total
  const sumTotal = owned.reduce((acc, b) => acc + b.total, 0);
  if (sumTotal !== rows.length) fail('I1', `soma ${sumTotal} != ${rows.length} (cenário ${s})`);

  // I2 — nenhum balde vazio é oferecido
  for (const b of owned) if (b.total === 0) fail('I2', `balde vazio ${b.key} (cenário ${s})`);

  // I6 — abertos somam
  const sumOpen = owned.reduce((acc, b) => acc + b.open, 0);
  const openTotal = rows.filter((r) => r.status === 'open').length;
  if (sumOpen !== openTotal) fail('I6', `abertos ${sumOpen} != ${openTotal} (cenário ${s})`);
  if (buckets[0].key !== 'all') fail('I6', `'all' não é o primeiro balde (cenário ${s})`);

  for (const b of buckets) {
    const filtered = applyFilter(rows, b.key);
    checks += 1;

    // I3 — subconjunto que preserva ordem + idempotência
    let cursor = -1;
    for (const row of filtered) {
      const at = rows.indexOf(row);
      if (at <= cursor) fail('I3', `ordem quebrada em ${b.key} (cenário ${s})`);
      cursor = at;
    }
    const again = applyFilter(filtered, b.key);
    if (again.length !== filtered.length) fail('I3', `filtro não idempotente em ${b.key}`);
    if (filtered.length !== b.total) fail('I3', `contagem ${filtered.length} != ${b.total}`);
    if (b.critical > b.open) fail('I3', `críticos ${b.critical} > abertos ${b.open}`);

    // I4 — 'all' é identidade
    if (b.key === 'all' && filtered.length !== rows.length) fail('I4', 'all não é identidade');
  }

  // I5 — seleção inválida degrada para 'all'
  for (const bogus of ['owner_inexistente', '', null, undefined, 'ALL', 'field_tech']) {
    const resolved = resolveFilter(buckets, bogus);
    const exists = buckets.some((b) => b.key === bogus);
    if (!exists && resolved !== 'all') fail('I5', `chave ${String(bogus)} não degradou`);
    if (applyFilter(rows, resolved).length === 0 && rows.length > 0 && !exists) {
      fail('I5', `degradação produziu lista vazia (cenário ${s})`);
    }
  }
}

console.log(`\n=== Onda 148 — filtro por responsável ===`);
console.log(`  cenários: ${SCENARIOS} · recortes avaliados: ${checks}`);

if (failures.length > 0) {
  console.error('\n❌ Invariantes violadas:');
  for (const f of failures.slice(0, 25)) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('  ✅ I1..I6 mantidas em todos os cenários.\n');
