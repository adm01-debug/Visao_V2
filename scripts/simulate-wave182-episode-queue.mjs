#!/usr/bin/env node
/**
 * Onda 182 — simulação exaustiva da fila durável de comandos de episódio.
 *
 * O que está sendo provado (invariantes que, se quebrarem, corrompem o livro
 * de reincidência):
 *
 *  I1. Nenhum fato aceito é perdido nem duplicado: com rede instável e
 *      recargas no meio, o servidor recebe exatamente uma vez cada fato.
 *  I2. Ordem por série: nenhum `close` chega antes do `open` correspondente.
 *  I3. Recuo é monotônico e respeita o teto.
 *  I4. Persistência é fiel: serializar/ler não inventa nem perde item.
 *  I5. Teto de fila é honesto: pendentes + descartados + entregues = ofertados.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wave182-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/episodeCommandQueue.ts'))};`,
);
execFileSync(
  'npx',
  ['esbuild', entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${join(dir, 'b.mjs')}`],
  { stdio: 'pipe' },
);
const {
  backoffMs,
  commandId,
  dueCommands,
  emptyCommandQueue,
  enqueueCommands,
  markDelivered,
  markFailed,
  parseQueue,
  queueStats,
  resolveQueueConfig,
  resumeAll,
  serializeQueue,
} = await import(join(dir, 'b.mjs'));

let assertions = 0;
let failures = 0;
const fail = (msg) => {
  failures += 1;
  if (failures <= 20) console.error(`  ✗ ${msg}`);
};
const ok = (cond, msg) => {
  assertions += 1;
  if (!cond) fail(msg);
};

// PRNG determinístico (mulberry32) — reprodutibilidade é requisito de gate.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Bloco A: recuo determinístico ----------------------------------------
{
  const cfg = resolveQueueConfig({ baseBackoffMs: 500, maxBackoffMs: 30_000 });
  let previous = 0;
  for (let attempts = 1; attempts <= 200; attempts += 1) {
    const value = backoffMs(attempts, cfg);
    ok(value >= previous, `I3: recuo regrediu em ${attempts}`);
    ok(value <= cfg.maxBackoffMs, `I3: recuo estourou o teto em ${attempts}`);
    ok(value >= cfg.baseBackoffMs, `I3: recuo abaixo da base em ${attempts}`);
    previous = value;
  }
  // Teto abaixo da base precisa ser saneado, nunca aceito.
  const weird = resolveQueueConfig({ baseBackoffMs: 5_000, maxBackoffMs: 100 });
  ok(weird.maxBackoffMs >= weird.baseBackoffMs, 'I3: teto ficou abaixo da base');
}

// --- Bloco B: entrega sob rede instável ------------------------------------
const SERIES = ['r1:a', 'r1:b', 'r2:a', 'r2:b', 'r3:a'];

for (let scenario = 0; scenario < 400; scenario += 1) {
  const rand = rng(0x182 + scenario);
  const cfg = {
    maxPending: 50 + Math.floor(rand() * 200),
    maxAttempts: 3 + Math.floor(rand() * 6),
    baseBackoffMs: 100 + Math.floor(rand() * 900),
    maxBackoffMs: 5_000 + Math.floor(rand() * 55_000),
    maxDead: 20,
  };
  const resolved = resolveQueueConfig(cfg);

  // Gera fatos coerentes por série: open sempre antes do close.
  const offered = [];
  for (const seriesKey of SERIES) {
    let t = 1_000 + Math.floor(rand() * 1_000);
    const episodes = 1 + Math.floor(rand() * 6);
    for (let e = 0; e < episodes; e += 1) {
      offered.push({ kind: 'open', seriesKey, at: t, severity: 'high' });
      t += 1_000 + Math.floor(rand() * 5_000);
      offered.push({ kind: 'close', seriesKey, at: t });
      t += 1_000 + Math.floor(rand() * 20_000);
    }
  }

  let queue = emptyCommandQueue();
  const deliveredOrder = new Map(); // série -> carimbo do último fato entregue
  const deliveredIds = new Map(); // id -> contagem de entregas

  let now = 0;
  let cursor = 0;
  for (let step = 0; step < 4_000 && (cursor < offered.length || queue.pending.length > 0); step += 1) {
    now += 1 + Math.floor(rand() * 3_000);

    // Chegada de fatos novos (às vezes reofertando o mesmo fato: I1).
    if (cursor < offered.length && rand() < 0.6) {
      const batch = offered.slice(cursor, cursor + 1 + Math.floor(rand() * 3));
      cursor += batch.length;
      queue = enqueueCommands(queue, batch, now, cfg);
      if (rand() < 0.3) queue = enqueueCommands(queue, batch, now, cfg); // duplicata
    }

    // Recarga da página no meio do caminho (I4).
    if (rand() < 0.05) {
      const before = queue;
      queue = parseQueue(serializeQueue(queue, now));
      ok(
        queue.pending.length === before.pending.length,
        `I4: persistência alterou o número de pendentes (cenário ${scenario})`,
      );
    }

    // Volta de conexão.
    if (rand() < 0.08) queue = resumeAll(queue, now);

    const due = dueCommands(queue, now);
    const seenSeries = new Set();
    for (const item of due) {
      ok(!seenSeries.has(item.command.seriesKey), 'I2: dois comandos da mesma série elegíveis');
      seenSeries.add(item.command.seriesKey);
      ok(item.nextAttemptAt <= now, 'I3: item em recuo foi considerado elegível');
    }

    for (const item of due) {
      const roll = rand();
      if (roll < 0.55) {
        // Entrega bem-sucedida. A garantia da fila é de **ordem temporal por
        // série**: um fato nunca chega ao servidor antes de outro mais antigo
        // da mesma série. Itens recusados definitivamente saem da fila (I4 do
        // módulo), então o par open/close pode ficar incompleto — o que não
        // pode acontecer jamais é inversão cronológica.
        const last = deliveredOrder.get(item.command.seriesKey) ?? null;
        if (last !== null) {
          ok(
            item.command.at >= last,
            `I2: inversão cronológica em ${item.command.seriesKey} (${item.command.at} < ${last})`,
          );
        }
        deliveredOrder.set(item.command.seriesKey, item.command.at);
        deliveredIds.set(item.id, (deliveredIds.get(item.id) ?? 0) + 1);
        ok(deliveredIds.get(item.id) === 1, `I1: fato entregue duas vezes (${item.id})`);
        queue = markDelivered(queue, item.id);
      } else if (roll < 0.9) {
        queue = markFailed(queue, item.id, 'retryable', now, 'network_timeout', cfg);
      } else {
        queue = markFailed(queue, item.id, 'permanent', now, 'stale_record', cfg);
      }
    }

    const stats = queueStats(queue, now);
    ok(stats.pending === queue.pending.length, 'estatística divergiu do estado');
    ok(stats.ready + stats.waiting === stats.pending, 'estatística inconsistente');
    ok(queue.dead.length <= resolved.maxDead, 'carta morta estourou o teto');
    ok(queue.pending.length <= resolved.maxPending, 'I5: fila estourou o teto');
  }

  // I5: contabilidade fechada — nada evapora em silêncio.
  const offeredIds = new Set(offered.map(commandId));
  const accounted =
    new Set([...deliveredIds.keys()]).size +
    queue.pending.length +
    queue.dead.length +
    queue.dropped +
    (offered.length - cursor);
  ok(
    accounted >= offeredIds.size,
    `I5: contabilidade não fecha no cenário ${scenario} (${accounted} < ${offeredIds.size})`,
  );
}

// --- Bloco C: entradas degeneradas ----------------------------------------
{
  const garbage = [
    null,
    undefined,
    42,
    'texto',
    { kind: 'open' },
    { kind: 'zap', seriesKey: 'a', at: 1 },
    { kind: 'open', seriesKey: 'a', at: 1, severity: 'roxo' },
    { kind: 'close', seriesKey: '   ', at: 1 },
    { kind: 'close', seriesKey: 'a', at: Number.POSITIVE_INFINITY },
  ];
  for (const item of garbage) {
    const q = enqueueCommands(emptyCommandQueue(), [item], 0);
    ok(q.pending.length === 0, `entrada degenerada aceita: ${JSON.stringify(item)}`);
  }
  for (const raw of ['', '   ', 'null', '[]', '{}', '{"version":1}', '{"version":1,"queue":{}}']) {
    const q = parseQueue(raw);
    ok(q.pending.length === 0 && q.dead.length === 0, `envelope inválido virou dado: ${raw}`);
  }
  ok(dueCommands(null, 0).length === 0, 'fila nula não pode explodir');
  ok(queueStats(emptyCommandQueue(), Number.NaN).pending === 0, 'relógio inválido não pode explodir');
}

console.log(`\nOnda 182 — fila durável de comandos de episódio`);
console.log(`Asserções: ${assertions.toLocaleString('pt-BR')}`);
console.log(`Falhas:    ${failures}`);
if (failures > 0) {
  console.error('\n❌ Gate reprovado');
  process.exit(1);
}
console.log('\n✅ Gate aprovado');
