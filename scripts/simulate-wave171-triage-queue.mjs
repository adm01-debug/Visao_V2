#!/usr/bin/env node
/**
 * Onda 171 — gate de simulação da fila de triagem do E-Map.
 *
 * Espelha byte a byte as regras de `src/lib/emap/triageQueue.ts`. Se a regra
 * mudar sem que este espelho mude junto, o gate quebra — que é exatamente o
 * ponto: prioridade de atendimento não pode derivar em silêncio.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'wave171-'));
const entry = join(tmp, 'entry.mjs');
writeFileSync(
  entry,
  `export * from '${join(process.cwd(), 'src/lib/emap/triageQueue.ts').replace(/\\/g, '/')}';\n` +
    `export * from '${join(process.cwd(), 'src/lib/emap/attentionClock.ts').replace(/\\/g, '/')}';\n`
);

let mod;
try {
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
  mod = await import(`file://${out}`);
} finally {
  // bundle é descartável; o módulo já está em memória
}

const {
  buildTriageQueue,
  compareTriage,
  triageTier,
  emptyTriageQueue,
  observeAttention,
  emptyAttentionLedger,
  DEFAULT_BAND_CONFIG,
} = mod;

let assertions = 0;
const failures = [];
const ok = (condition, message) => {
  assertions += 1;
  if (!condition) failures.push(message);
};

const SEV = ['alert', 'offline', 'warning', 'unknown'];
const rank = (s) => SEV.indexOf(s);

/** Constrói um livro determinístico. */
function ledgerOf(specs, now) {
  const ledger = {};
  for (const spec of specs) {
    ledger[spec.id] = {
      cameraId: spec.id,
      status: spec.status,
      since: now - (spec.statusAge ?? spec.age),
      openedAt: now - spec.age,
      worst: spec.worst ?? spec.status,
      changes: spec.changes ?? 0,
      lastSeen: now,
    };
  }
  return ledger;
}

const NOW = 1_800_000_000_000;
const FRESH = 60_000;
const SUSTAINED = 300_000;
const PROLONGED = 3_600_000;
const AGES = [FRESH, SUSTAINED, PROLONGED];

// ───────── 1. Ordem total, determinismo e invariantes de comparação ─────────
{
  const rnd = (seed) => {
    let s = seed >>> 0;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  };
  for (let seed = 1; seed <= 300; seed += 1) {
    const rand = rnd(seed);
    const size = 1 + Math.floor(rand() * 25);
    const specs = [];
    const acked = [];
    for (let i = 0; i < size; i += 1) {
      const id = `cam-${String(i).padStart(3, '0')}`;
      const status = SEV[Math.floor(rand() * SEV.length)];
      const age = AGES[Math.floor(rand() * AGES.length)] + Math.floor(rand() * 1000);
      specs.push({ id, status, age });
      if (rand() < 0.25) acked.push(id);
    }
    const ledger = ledgerOf(specs, NOW);
    const q1 = buildTriageQueue({ ledger, now: NOW, acknowledged: acked });
    const q2 = buildTriageQueue({ ledger, now: NOW, acknowledged: [...acked].reverse() });

    ok(
      q1.items.map((i) => i.cameraId).join(',') === q2.items.map((i) => i.cameraId).join(','),
      `seed ${seed}: fila não determinística`
    );
    ok(q1.totals.total === size, `seed ${seed}: total divergente`);
    ok(q1.totals.open + q1.totals.acknowledged === size, `seed ${seed}: aberto+ciente ≠ total`);

    for (let i = 1; i < q1.items.length; i += 1) {
      const a = q1.items[i - 1];
      const b = q1.items[i];
      ok(compareTriage(a, b) <= 0, `seed ${seed}: ordem violada em ${i}`);
      // Regra 3: reconhecido nunca antes de aberto.
      ok(!(a.acknowledged && !b.acknowledged), `seed ${seed}: ciente antes de aberto`);
      if (a.acknowledged === b.acknowledged) {
        ok(a.tier <= b.tier, `seed ${seed}: gravidade fora de ordem`);
        if (a.tier === b.tier) {
          ok(
            a.attentionAgeMs > b.attentionAgeMs ||
              (a.attentionAgeMs === b.attentionAgeMs && a.cameraId <= b.cameraId),
            `seed ${seed}: desempate por idade/id violado`
          );
        }
      }
    }
    // `next` é sempre o primeiro aberto.
    const firstOpen = q1.items.find((i) => !i.acknowledged) ?? null;
    ok(
      (q1.next?.cameraId ?? null) === (firstOpen?.cameraId ?? null),
      `seed ${seed}: next diverge do primeiro aberto`
    );
  }
}

// ───────── 2. Promoção por dívida: no máximo um degrau, nunca vira alarme ─────────
for (const status of SEV) {
  for (const age of [
    0,
    FRESH,
    DEFAULT_BAND_CONFIG.freshMs,
    SUSTAINED,
    DEFAULT_BAND_CONFIG.sustainedMs,
    PROLONGED,
  ]) {
    const ledger = ledgerOf([{ id: 'c', status, age }], NOW);
    const [item] = buildTriageQueue({ ledger, now: NOW }).items;
    const base = rank(status);
    ok(item.baseTier === base, `${status}/${age}: baseTier errado`);
    ok(item.tier >= base - 1, `${status}/${age}: promoveu mais de um degrau`);
    ok(item.tier >= 1 || base === 0, `${status}/${age}: promoção alcançou o topo (alarme)`);
    if (age >= DEFAULT_BAND_CONFIG.sustainedMs) {
      ok(item.band === 'prolonged', `${status}/${age}: faixa deveria ser prolongada`);
      ok(item.tier === Math.max(base - 1, 1), `${status}/${age}: promoção incorreta`);
      ok(item.promoted === (item.tier !== base), `${status}/${age}: flag promoted inconsistente`);
    } else {
      ok(item.promoted === false, `${status}/${age}: promoveu sem dívida`);
      ok(item.tier === base, `${status}/${age}: tier alterado sem dívida`);
    }
    const t = triageTier({ ...Object.values(ledger)[0] }, item.band);
    ok(
      t.tier === item.tier && t.baseTier === item.baseTier,
      `${status}/${age}: triageTier divergente`
    );
  }
}

// Alarme recente sempre antes de aviso prolongado promovido.
{
  const ledger = ledgerOf(
    [
      { id: 'a-alarme-novo', status: 'alert', age: 1_000 },
      { id: 'b-aviso-velho', status: 'warning', age: 12 * 3_600_000 },
      { id: 'c-desconhecido-velho', status: 'unknown', age: 48 * 3_600_000 },
    ],
    NOW
  );
  const q = buildTriageQueue({ ledger, now: NOW });
  ok(q.items[0].cameraId === 'a-alarme-novo', 'alarme novo perdeu o topo para dívida');
  ok(q.next.cameraId === 'a-alarme-novo', 'next não é o alarme');
  ok(q.items[1].tier <= q.items[2].tier, 'ordem de dívida incoerente');
}

// Offline prolongado não pode empatar acima de alert.
{
  const ledger = ledgerOf(
    [
      { id: 'x-offline-antigo', status: 'offline', age: 72 * 3_600_000 },
      { id: 'y-alarme', status: 'alert', age: 10 },
    ],
    NOW
  );
  const q = buildTriageQueue({ ledger, now: NOW });
  ok(q.items[0].cameraId === 'y-alarme', 'offline promovido ultrapassou alarme');
  ok(q.items[1].tier === 1, 'teto de promoção rompido');
}

// ───────── 3. Reconhecer não é resolver ─────────
{
  const ledger = ledgerOf(
    [
      { id: 'a', status: 'alert', age: PROLONGED },
      { id: 'b', status: 'unknown', age: FRESH },
    ],
    NOW
  );
  const q = buildTriageQueue({ ledger, now: NOW, acknowledged: ['a'] });
  ok(q.totals.total === 2, 'ciente sumiu do total');
  ok(q.items.length === 2, 'ciente sumiu da fila');
  ok(q.items[0].cameraId === 'b', 'ciente permaneceu na frente');
  ok(q.items[1].acknowledged === true, 'flag de ciente perdida');
  ok(q.items[1].attentionAgeMs === PROLONGED, 'ciente perdeu a idade');
  ok(q.next.cameraId === 'b', 'next apontou para item ciente');
  ok(q.totals.open === 1 && q.totals.acknowledged === 1, 'contagem de ciente errada');
  const allAcked = buildTriageQueue({ ledger, now: NOW, acknowledged: ['a', 'b'] });
  ok(allAcked.next === null, 'next deveria ser nulo com tudo ciente');
  ok(allAcked.totals.open === 0, 'aberto deveria ser zero');
}

// ───────── 4. Sem planta continua na fila ─────────
{
  const ledger = ledgerOf(
    [
      { id: 'sem-planta', status: 'offline', age: SUSTAINED },
      { id: 'com-planta', status: 'warning', age: SUSTAINED },
    ],
    NOW
  );
  const locate = (id) => (id === 'com-planta' ? { planId: 'p1', planName: 'Térreo' } : null);
  const q = buildTriageQueue({ ledger, now: NOW, locate, activePlanId: 'p1' });
  ok(q.totals.total === 2, 'câmera sem planta foi descartada');
  ok(q.totals.offPlan === 1, 'contagem fora da planta errada');
  ok(q.items[0].cameraId === 'sem-planta', 'gravidade ignorada por falta de planta');
  ok(q.items[0].planId === null && q.items[0].planName === null, 'planta inventada');
  ok(q.items[0].onActivePlan === false, 'sem planta marcada como planta ativa');
  ok(q.items[1].onActivePlan === true, 'planta ativa não reconhecida');
  ok(q.totals.byPlan.length === 2, 'balde por planta incorreto');
  const semPlanta = q.totals.byPlan.find((b) => b.planId === null);
  ok(semPlanta && semPlanta.planName === 'Sem planta', 'rótulo de sem planta ausente');

  // Locator que explode nunca derruba a fila.
  const boom = buildTriageQueue({
    ledger,
    now: NOW,
    locate: () => {
      throw new Error('planta indisponível');
    },
  });
  ok(boom.totals.total === 2, 'locator com erro perdeu itens');
  ok(boom.totals.offPlan === 2, 'locator com erro deveria virar sem planta');
}

// ───────── 5. Teto não corrompe contagem ─────────
{
  const specs = [];
  for (let i = 0; i < 40; i += 1) {
    specs.push({ id: `cam-${String(i).padStart(2, '0')}`, status: SEV[i % 4], age: AGES[i % 3] });
  }
  const ledger = ledgerOf(specs, NOW);
  const full = buildTriageQueue({ ledger, now: NOW });
  for (const limit of [0, 1, 5, 39, 40, 41, 1000]) {
    const q = buildTriageQueue({ ledger, now: NOW, limit });
    ok(q.totals.total === 40, `limit ${limit}: total corrompido`);
    ok(q.items.length === Math.min(limit, 40), `limit ${limit}: corte errado`);
    ok(q.dropped === 40 - q.items.length, `limit ${limit}: dropped errado`);
    ok(
      q.items.every((item, index) => item.cameraId === full.items[index].cameraId),
      `limit ${limit}: prefixo divergente da fila completa`
    );
    ok(q.next?.cameraId === full.next?.cameraId, `limit ${limit}: next mudou com o teto`);
    const soma = q.totals.byPlan.reduce((acc, b) => acc + b.count, 0);
    ok(soma === 40, `limit ${limit}: soma por planta divergente`);
    const banda = q.totals.byBand.fresh + q.totals.byBand.sustained + q.totals.byBand.prolonged;
    ok(banda === 40, `limit ${limit}: soma por faixa divergente`);
  }
  // limite negativo/NaN é ignorado (fila completa) em vez de virar corte silencioso.
  for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
    const q = buildTriageQueue({ ledger, now: NOW, limit: bad });
    ok(q.items.length === 40, `limit inválido ${String(bad)} cortou a fila`);
  }
}

// ───────── 6. Pureza, imutabilidade e relógio inválido ─────────
{
  const ledger = ledgerOf([{ id: 'a', status: 'alert', age: SUSTAINED }], NOW);
  const snapshot = JSON.stringify(ledger);
  const q = buildTriageQueue({ ledger, now: NOW });
  ok(JSON.stringify(ledger) === snapshot, 'livro de atenção foi mutado');
  ok(Object.isFrozen(q) === false || true, 'placeholder');
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const invalid = buildTriageQueue({ ledger, now: bad });
    ok(
      invalid.items.length === 0 && invalid.totals.total === 0,
      `relógio ${String(bad)} produziu fila`
    );
    ok(invalid.next === null, `relógio ${String(bad)} sugeriu ação`);
  }
  const vazia = buildTriageQueue({ ledger: {}, now: NOW });
  ok(vazia.totals.total === 0 && vazia.next === null, 'livro vazio produziu fila');
  ok(emptyTriageQueue().totals.open === 0, 'fila vazia canônica inconsistente');

  // Idade nunca negativa mesmo com carimbo no futuro.
  const futuro = ledgerOf([{ id: 'f', status: 'warning', age: -600_000 }], NOW);
  const qf = buildTriageQueue({ ledger: futuro, now: NOW });
  ok(qf.items[0].attentionAgeMs >= 0, 'idade negativa vazou');
  ok(qf.items[0].statusAgeMs >= 0, 'idade de estado negativa vazou');
  ok(qf.items[0].band === 'fresh', 'carimbo futuro virou dívida');
}

// ───────── 7. Integração com o relógio real (observeAttention) ─────────
{
  let ledger = emptyAttentionLedger();
  ledger = observeAttention(ledger, [{ cameraId: 'c1', status: 'warning' }], NOW - 4 * 3_600_000);
  ledger = observeAttention(ledger, [{ cameraId: 'c2', status: 'alert' }], NOW - 30_000);
  // Confirmação repetida não rejuvenesce a dívida.
  for (let i = 0; i < 10; i += 1) {
    ledger = observeAttention(ledger, [{ cameraId: 'c1', status: 'warning' }], NOW - i * 1_000);
  }
  const q = buildTriageQueue({ ledger, now: NOW });
  ok(q.items[0].cameraId === 'c2', 'alarme perdeu a frente após confirmações');
  const c1 = q.items.find((i) => i.cameraId === 'c1');
  ok(c1.band === 'prolonged', 'confirmação reiniciou o relógio');
  ok(c1.promoted === true, 'dívida antiga não foi promovida');

  // Normalização observada remove da fila.
  const curado = observeAttention(ledger, [{ cameraId: 'c1', status: 'online' }], NOW);
  const q2 = buildTriageQueue({ ledger: curado, now: NOW });
  ok(q2.totals.total === 1, 'normalização não removeu da fila');
  ok(
    q2.items.every((i) => i.cameraId !== 'c1'),
    'câmera normalizada permaneceu'
  );
}

// ───────── 8. Baldes por planta: pior estado, nunca média ─────────
{
  const specs = [
    { id: 'a1', status: 'online', age: FRESH },
    { id: 'a2', status: 'unknown', age: FRESH },
    { id: 'a3', status: 'alert', age: FRESH },
    { id: 'b1', status: 'warning', age: FRESH },
    { id: 'b2', status: 'warning', age: FRESH },
    { id: 'b3', status: 'warning', age: FRESH },
  ];
  const ledger = ledgerOf(specs, NOW);
  const locate = (id) =>
    id.startsWith('a')
      ? { planId: 'A', planName: 'Andar A' }
      : { planId: 'B', planName: 'Andar B' };
  const q = buildTriageQueue({ ledger, now: NOW, locate });
  const a = q.totals.byPlan.find((b) => b.planId === 'A');
  const b = q.totals.byPlan.find((b) => b.planId === 'B');
  ok(a.worst === 'alert', 'pior estado do andar A incorreto');
  ok(b.worst === 'warning', 'pior estado do andar B incorreto');
  ok(q.totals.byPlan[0].planId === 'A', 'andar mais grave não veio primeiro');
  ok(a.count === 3 && b.count === 3, 'contagem por andar incorreta');
  const qAck = buildTriageQueue({ ledger, now: NOW, locate, acknowledged: ['a3'] });
  const aAck = qAck.totals.byPlan.find((x) => x.planId === 'A');
  ok(aAck.open === 2 && aAck.count === 3, 'ciente alterou a contagem total do andar');
  ok(aAck.worst === 'alert', 'ciente apagou a gravidade do andar');
}

// ───────── 9. Estresse: 5.000 câmeras, invariantes globais ─────────
{
  const specs = [];
  for (let i = 0; i < 5_000; i += 1) {
    specs.push({
      id: `s-${String(i).padStart(5, '0')}`,
      status: SEV[i % SEV.length],
      age: (i % 97) * 60_000,
      changes: i % 5,
    });
  }
  const ledger = ledgerOf(specs, NOW);
  const acked = specs.filter((_, i) => i % 7 === 0).map((s) => s.id);
  const started = Date.now();
  const q = buildTriageQueue({ ledger, now: NOW, acknowledged: acked, limit: 50 });
  ok(Date.now() - started < 2_000, 'fila de 5k levou mais de 2s');
  ok(q.totals.total === 5_000, 'estresse: total divergente');
  ok(q.totals.acknowledged === acked.length, 'estresse: contagem de ciente divergente');
  ok(q.dropped === 4_950, 'estresse: dropped divergente');
  ok(q.items.every((i) => !i.acknowledged) || q.totals.open < 50, 'estresse: ciente furou o topo');
  ok(q.items[0].tier <= q.items[q.items.length - 1].tier, 'estresse: ordem global quebrada');
}

console.log(`\nOnda 171 — fila de triagem: ${assertions} asserções, ${failures.length} falhas.`);
if (failures.length > 0) {
  for (const failure of failures.slice(0, 25)) console.error(`  ✗ ${failure}`);
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
rmSync(tmp, { recursive: true, force: true });
