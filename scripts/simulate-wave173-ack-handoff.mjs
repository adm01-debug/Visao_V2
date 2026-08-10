#!/usr/bin/env node
/**
 * Onda 173 — simulação do corte de ciência na passagem de turno.
 *
 * Invariantes exercitadas:
 *  I1  conservação: kept + inherited + stale == total original
 *  I2  corte: nenhum registro mantido tem `at` < shiftStartedAt
 *  I3  herança: todo item herdado tem `at` < shiftStartedAt E fato vivo
 *  I4  idempotência: segunda passada com o mesmo corte não muda nada
 *  I5  dado ruim é no-op (shiftStartedAt/now inválidos)
 *  I6  ordem determinística (gravidade → idade → id)
 *  I7  imutabilidade da entrada
 *  I8  `escalated` só quando a gravidade atual é estritamente pior
 *  I9  resumo coerente com a lista
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'wave173-'));
const entry = join(tmp, 'entry.mjs');
const abs = (p) => join(process.cwd(), p).replace(/\\/g, '/');
writeFileSync(
  entry,
  `export * from '${abs('src/lib/emap/ackHandoff.ts')}';\n` +
    `export { severityRank } from '${abs('src/lib/emap/floorPlanGeometry.ts')}';\n`
);
const out = join(tmp, 'bundle.mjs');
execFileSync(
  'npx',
  [
    'esbuild',
    entry,
    '--bundle',
    '--format=esm',
    '--platform=node',
    `--outfile=${out}`,
    '--log-level=error',
  ],
  { stdio: 'inherit' }
);
const mod = await import(`file://${out}`);
const { handoffAcks, summarizeAckHandoff, formatInheritedAcks, severityRank } = mod;
const RANK = Object.fromEntries(
  ['alert', 'offline', 'warning', 'unknown', 'online'].map((s) => [s, severityRank(s)])
);

const STATUSES = ['alert', 'offline', 'warning', 'unknown', 'online'];
let asserts = 0;
let failures = 0;
const fail = (name, detail) => {
  failures += 1;
  if (failures <= 20) console.error(`FALHA: ${name} — ${detail}`);
};
const ok = (cond, name, detail = '') => {
  asserts += 1;
  if (!cond) fail(name, detail);
};

// PRNG determinístico
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 100000) / 100000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const SCENARIOS = 4000;
for (let s = 0; s < SCENARIOS; s += 1) {
  const shiftStartedAt = 1_700_000_000_000 + int(0, 10_000_000);
  const now = shiftStartedAt + int(0, 8 * 3600_000);
  const n = int(0, 12);
  const acks = {};
  const ledger = {};
  for (let i = 0; i < n; i += 1) {
    const id = `cam-${int(0, 20)}`;
    const at = shiftStartedAt + (rnd() < 0.5 ? -int(1, 5_000_000) : int(0, 1_000_000));
    if (at > now) continue;
    const status = pick(STATUSES);
    acks[id] = { cameraId: id, at, status, worst: status, openedAt: at - int(0, 900_000) };
    if (rnd() < 0.8) {
      const cur = pick(STATUSES);
      ledger[id] = {
        cameraId: id,
        status: cur,
        worst: cur,
        openedAt: acks[id].openedAt + (rnd() < 0.2 ? int(1, 1000) : 0),
        changes: int(0, 5),
      };
    }
  }
  const frozenAcks = JSON.parse(JSON.stringify(acks));
  const frozenLedger = JSON.parse(JSON.stringify(ledger));

  const res = handoffAcks(acks, ledger, shiftStartedAt, now);

  // I7
  ok(
    JSON.stringify(acks) === JSON.stringify(frozenAcks) &&
      JSON.stringify(ledger) === JSON.stringify(frozenLedger),
    'I7 imutabilidade',
    `cenário ${s}`
  );

  const total = Object.keys(frozenAcks).length;
  const kept = Object.keys(res.acks).length;
  // I1
  ok(
    kept + res.inherited.length + res.stale === total,
    'I1 conservação',
    `${kept}+${res.inherited.length}+${res.stale}!=${total}`
  );

  // I2
  for (const id of Object.keys(res.acks)) {
    ok(res.acks[id].at >= shiftStartedAt, 'I2 corte', `${id} at=${res.acks[id].at}`);
  }

  // I3 / I8
  for (const item of res.inherited) {
    ok(frozenAcks[item.cameraId].at < shiftStartedAt, 'I3 herança pré-turno', item.cameraId);
    ok(Boolean(frozenLedger[item.cameraId]), 'I3 herança tem fato vivo', item.cameraId);
    const rec = frozenAcks[item.cameraId];
    const cur = frozenLedger[item.cameraId];
    const expected = RANK[cur.status] < RANK[rec.status] || RANK[cur.worst] < RANK[rec.worst];
    ok(item.escalated === expected, 'I8 escalated', item.cameraId);
  }

  // I6
  for (let i = 1; i < res.inherited.length; i += 1) {
    const a = res.inherited[i - 1];
    const b = res.inherited[i];
    const okOrder =
      RANK[a.currentStatus] < RANK[b.currentStatus] ||
      (RANK[a.currentStatus] === RANK[b.currentStatus] &&
        (a.ageMs > b.ageMs || (a.ageMs === b.ageMs && a.cameraId <= b.cameraId)));
    ok(okOrder, 'I6 ordem', `${a.cameraId} antes de ${b.cameraId}`);
  }

  // I4
  const again = handoffAcks(res.acks, ledger, shiftStartedAt, now);
  ok(again.changed === false && again.acks === res.acks, 'I4 idempotência', `cenário ${s}`);

  // I5
  for (const bad of [Number.NaN, Infinity, undefined, null, '123']) {
    const r1 = handoffAcks(acks, ledger, bad, now);
    const r2 = handoffAcks(acks, ledger, shiftStartedAt, bad);
    ok(r1.changed === false && r1.acks === acks, 'I5 shiftStartedAt inválido', String(bad));
    ok(r2.changed === false && r2.acks === acks, 'I5 now inválido', String(bad));
  }

  // I9
  const sum = summarizeAckHandoff(res.inherited);
  ok(sum.total === res.inherited.length, 'I9 total');
  ok(sum.escalated === res.inherited.filter((i) => i.escalated).length, 'I9 escalated');
  if (res.inherited.length === 0) {
    ok(sum.worst === null && sum.oldest === null, 'I9 vazio');
  } else {
    const worstRank = Math.min(...res.inherited.map((i) => RANK[i.currentStatus]));
    ok(RANK[sum.worst] === worstRank, 'I9 worst');
    ok(sum.oldest.ageMs === Math.max(...res.inherited.map((i) => i.ageMs)), 'I9 oldest');
  }

  const lines = formatInheritedAcks(
    res.inherited,
    (id) => id,
    (ms) => `${ms}ms`
  );
  ok(
    res.inherited.length === 0 ? lines.length === 0 : lines.length === res.inherited.length + 1,
    'I2b relatório completo'
  );
}

// Casos-limite nomeados
{
  const shift = 1000;
  const acks = {
    a: { cameraId: 'a', at: 1000, status: 'warning', worst: 'warning', openedAt: 900 },
  };
  const ledger = {
    a: { cameraId: 'a', status: 'warning', worst: 'warning', openedAt: 900, changes: 0 },
  };
  const r = handoffAcks(acks, ledger, shift, 2000);
  ok(r.changed === false, 'limite: at == shiftStartedAt permanece');
}
{
  const acks = {
    a: { cameraId: 'a', at: 999, status: 'warning', worst: 'warning', openedAt: 900 },
  };
  const r = handoffAcks(acks, {}, 1000, 2000);
  ok(
    r.changed === true && r.stale === 1 && r.inherited.length === 0,
    'sem fato vivo = stale, não dívida'
  );
}
{
  const acks = {
    a: { cameraId: 'a', at: 999, status: 'warning', worst: 'warning', openedAt: 900 },
  };
  const ledger = {
    a: { cameraId: 'a', status: 'online', worst: 'warning', openedAt: 900, changes: 1 },
  };
  const r = handoffAcks(acks, ledger, 1000, 2000);
  ok(r.inherited[0].escalated === false, 'melhora não é agravamento');
}
{
  const r = handoffAcks({}, {}, 1000, 2000);
  ok(r.changed === false && r.inherited.length === 0, 'livro vazio é no-op');
}

console.log(`Onda 173 — asserções: ${asserts}, falhas: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
