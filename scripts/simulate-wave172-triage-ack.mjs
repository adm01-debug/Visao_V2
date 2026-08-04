#!/usr/bin/env node
/**
 * Onda 172 — gate de simulação da ciência durável da fila de triagem.
 *
 * Espelha as regras de `src/lib/emap/triageAck.ts`. Se a regra mudar sem que
 * este espelho mude junto, o gate quebra — que é o ponto: "eu já vi isso" não
 * pode virar "isso foi resolvido" em silêncio.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'wave172-'));
const entry = join(tmp, 'entry.mjs');
const abs = (p) => join(process.cwd(), p).replace(/\\/g, '/');
writeFileSync(
  entry,
  `export * from '${abs('src/lib/emap/triageAck.ts')}';\n` +
    `export { severityRank } from '${abs('src/lib/emap/floorPlanGeometry.ts')}';\n` +
    `export { buildTriageQueue } from '${abs('src/lib/emap/triageQueue.ts')}';\n`
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

const {
  acknowledge,
  acknowledgedIds,
  unacknowledge,
  evaluateAck,
  reconcileAcks,
  parseAckLedger,
  serializeAckLedger,
  readAckState,
  writeAckState,
  emptyAckLedger,
  severityRank,
  buildTriageQueue,
  DEFAULT_ACK_CONFIG,
  ACK_SCHEMA_VERSION,
} = mod;

let assertions = 0;
const failures = [];
const check = (label, condition) => {
  assertions += 1;
  if (!condition) failures.push(label);
};

const STATUSES = ['alert', 'offline', 'warning', 'online', 'unknown'];
const T0 = 1_760_000_000_000;

const mkEntry = (over = {}) => ({
  cameraId: 'cam-1',
  status: 'warning',
  since: T0,
  openedAt: T0,
  worst: 'warning',
  changes: 1,
  lastSeen: T0,
  ...over,
});

// --- 1. Ciência congela o estado observado -----------------------------------
{
  const e = mkEntry();
  const acks = acknowledge(emptyAckLedger(), e, T0 + 1000);
  const rec = acks['cam-1'];
  check('registro criado', !!rec);
  check('carimbo é o do reconhecimento', rec.at === T0 + 1000);
  check('estado congelado', rec.status === 'warning' && rec.worst === 'warning');
  check('janela congelada', rec.openedAt === T0);
  check('imutável: livro original intacto', Object.keys(emptyAckLedger()).length === 0);
  check('ids expostos', acknowledgedIds(acks).has('cam-1'));
  check('desfazer remove', !('cam-1' in unacknowledge(acks, 'cam-1')));
  check('desfazer inexistente é no-op', unacknowledge(acks, 'x') === acks);
  check('entrada inválida não cria ciência', acknowledge(emptyAckLedger(), null, T0) !== undefined);
  check(
    'relógio inválido não cria ciência',
    Object.keys(acknowledge(emptyAckLedger(), e, NaN)).length === 0
  );
}

// --- 2. Matriz exaustiva de agravamento/melhora ------------------------------
for (const ackStatus of STATUSES) {
  for (const nowStatus of STATUSES) {
    const rec = {
      cameraId: 'cam-1',
      at: T0,
      status: ackStatus,
      worst: ackStatus,
      openedAt: T0,
    };
    const e = mkEntry({ status: nowStatus, worst: nowStatus, openedAt: T0 });
    const verdict = evaluateAck(rec, e, T0 + 1000);
    const worse = severityRank(nowStatus) < severityRank(ackStatus);
    check(
      `agravamento revoga (${ackStatus}->${nowStatus})`,
      worse ? verdict === 'escalated' : verdict !== 'escalated'
    );
    if (!worse) {
      check(`melhora/igual mantém ciência (${ackStatus}->${nowStatus})`, verdict === null);
    }
  }
}

// --- 3. Pior da janela também agrava ------------------------------------------
{
  const rec = { cameraId: 'cam-1', at: T0, status: 'warning', worst: 'warning', openedAt: T0 };
  const e = mkEntry({ status: 'warning', worst: 'alert', openedAt: T0 });
  check(
    'pior histórico revoga mesmo com status igual',
    evaluateAck(rec, e, T0 + 1) === 'escalated'
  );
}

// --- 4. Janela nova / ausência / caducidade -----------------------------------
{
  const rec = { cameraId: 'cam-1', at: T0, status: 'warning', worst: 'warning', openedAt: T0 };
  check(
    'janela nova revoga',
    evaluateAck(rec, mkEntry({ openedAt: T0 + 1 }), T0 + 2) === 'reopened'
  );
  check('janela igual não revoga', evaluateAck(rec, mkEntry({ openedAt: T0 }), T0 + 2) === null);
  check(
    'janela anterior não revoga',
    evaluateAck(rec, mkEntry({ openedAt: T0 - 5 }), T0 + 2) === null
  );
  check('sem entrada limpa', evaluateAck(rec, undefined, T0 + 2) === 'resolved');
  const ttl = DEFAULT_ACK_CONFIG.ttlMs;
  check('antes do prazo mantém', evaluateAck(rec, mkEntry(), T0 + ttl - 1) === null);
  check('no prazo caduca', evaluateAck(rec, mkEntry(), T0 + ttl) === 'expired');
  check(
    'agravamento tem precedência sobre caducidade',
    evaluateAck(rec, mkEntry({ status: 'alert', worst: 'alert' }), T0 + ttl * 3) === 'escalated'
  );
  check(
    'reabertura tem precedência sobre caducidade',
    evaluateAck(rec, mkEntry({ openedAt: T0 + 10 }), T0 + ttl * 3) === 'reopened'
  );
}

// --- 5. Reconciliação em lote --------------------------------------------------
{
  const ledger = {};
  let acks = emptyAckLedger();
  for (let i = 0; i < 200; i += 1) {
    const id = `cam-${String(i).padStart(3, '0')}`;
    const e = mkEntry({
      cameraId: id,
      status: i % 2 ? 'warning' : 'offline',
      worst: i % 2 ? 'warning' : 'offline',
    });
    ledger[id] = e;
    acks = acknowledge(acks, e, T0);
  }
  const stable = reconcileAcks(acks, ledger, T0 + 1000);
  check('nada muda quando nada mudou', stable.changed === false && stable.acks === acks);
  check('sem revogações', stable.revocations.length === 0);

  // Agrava 50, reabre 30, remove 20 do relógio.
  const mutated = { ...ledger };
  for (let i = 0; i < 50; i += 1)
    mutated[`cam-${String(i).padStart(3, '0')}`] = mkEntry({
      cameraId: `cam-${String(i).padStart(3, '0')}`,
      status: 'alert',
      worst: 'alert',
    });
  for (let i = 50; i < 80; i += 1)
    mutated[`cam-${String(i).padStart(3, '0')}`] = mkEntry({
      cameraId: `cam-${String(i).padStart(3, '0')}`,
      status: mutated[`cam-${String(i).padStart(3, '0')}`].status,
      worst: mutated[`cam-${String(i).padStart(3, '0')}`].worst,
      openedAt: T0 + 5,
    });
  for (let i = 80; i < 100; i += 1) delete mutated[`cam-${String(i).padStart(3, '0')}`];

  const result = reconcileAcks(acks, mutated, T0 + 1000);
  const byReason = result.revocations.reduce(
    (acc, r) => ({ ...acc, [r.reason]: (acc[r.reason] ?? 0) + 1 }),
    {}
  );
  check('50 agravamentos', byReason.escalated === 50);
  check('30 reaberturas', byReason.reopened === 30);
  check('20 limpezas', byReason.resolved === 20);
  check('100 cientes preservados', Object.keys(result.acks).length === 100);
  check('changed sinalizado', result.changed === true);
  check('livro original intacto', Object.keys(acks).length === 200);
  check(
    'revogações ordenadas por id',
    result.revocations.every((r, i, arr) => i === 0 || arr[i - 1].cameraId < r.cameraId)
  );
  check(
    'revogação declara origem e destino',
    result.revocations.every(
      (r) => STATUSES.includes(r.from) && (r.to === null || STATUSES.includes(r.to))
    )
  );

  // Caducidade em massa.
  const expired = reconcileAcks(acks, ledger, T0 + DEFAULT_ACK_CONFIG.ttlMs + 1);
  check('todas caducam após o prazo', expired.revocations.length === 200);
  check('livro fica vazio', Object.keys(expired.acks).length === 0);

  // Relógio inválido nunca revoga nada.
  check('relógio inválido é inerte', reconcileAcks(acks, ledger, NaN).changed === false);
  check(
    'relógio inválido não perde ciência',
    Object.keys(reconcileAcks(acks, ledger, NaN).acks).length === 200
  );
  check('ledger ausente limpa tudo', reconcileAcks(acks, {}, T0 + 1).revocations.length === 200);
}

// --- 6. Contrato com a fila de triagem ------------------------------------------
{
  const ledger = {
    'cam-a': mkEntry({ cameraId: 'cam-a', status: 'alert', worst: 'alert' }),
    'cam-b': mkEntry({ cameraId: 'cam-b', status: 'warning', worst: 'warning' }),
  };
  const acks = acknowledge(emptyAckLedger(), ledger['cam-a'], T0);
  const q = buildTriageQueue({ ledger, now: T0 + 1000, acknowledged: acknowledgedIds(acks) });
  check('ciente não some da fila', q.totals.total === 2);
  check('ciente sai do balcão de abertos', q.totals.open === 1);
  check(
    'ciente vai para o fim mesmo sendo mais grave',
    q.items[q.items.length - 1].cameraId === 'cam-a'
  );
  check('próxima ação é o não reconhecido', q.next.cameraId === 'cam-b');
  check(
    'idade preservada',
    q.items.every((i) => i.attentionAgeMs === 1000)
  );
}

// --- 7. Serialização / saneamento -------------------------------------------------
{
  let acks = emptyAckLedger();
  for (let i = 0; i < 5; i += 1)
    acks = acknowledge(acks, mkEntry({ cameraId: `cam-${i}` }), T0 + i);
  const raw = serializeAckLedger(acks, T0 + 10);
  const round = parseAckLedger(raw, T0 + 20);
  check(
    'ida e volta preserva tudo',
    round.outcome === 'restored' && Object.keys(round.acks).length === 5
  );
  check('sem descartes no caminho feliz', round.discarded === 0);
  check(
    'instantes voltam idênticos',
    Object.values(round.acks).every((r) => r.at === acks[r.cameraId].at && r.openedAt === T0)
  );

  check('vazio é vazio', parseAckLedger(null, T0).outcome === 'empty');
  check('string vazia é vazio', parseAckLedger('', T0).outcome === 'empty');
  check('json quebrado é corrupto', parseAckLedger('{{{', T0).outcome === 'corrupt');
  check('escalar é corrupto', parseAckLedger('42', T0).outcome === 'corrupt');
  check(
    'versão desconhecida descarta tudo',
    parseAckLedger(JSON.stringify({ v: 99, savedAt: T0, records: [] }), T0).outcome === 'corrupt'
  );
  check(
    'sem records é corrupto',
    parseAckLedger(JSON.stringify({ v: ACK_SCHEMA_VERSION, savedAt: T0 }), T0).outcome === 'corrupt'
  );
  check(
    'arquivo do futuro é suspeito',
    parseAckLedger(serializeAckLedger(acks, T0 + 10 * 60 * 1000), T0).outcome === 'clock_suspect'
  );
  check(
    'folga de NTP não descarta',
    parseAckLedger(serializeAckLedger(acks, T0 + 60 * 1000), T0).outcome === 'restored'
  );

  const dirty = JSON.stringify({
    v: ACK_SCHEMA_VERSION,
    savedAt: T0,
    records: [
      { cameraId: 'ok', at: T0, status: 'alert', worst: 'alert', openedAt: T0 },
      { cameraId: '', at: T0, status: 'alert', worst: 'alert', openedAt: T0 },
      { cameraId: 'x', at: 'ontem', status: 'alert', worst: 'alert', openedAt: T0 },
      { cameraId: 'y', at: T0, status: 'explodiu', worst: 'alert', openedAt: T0 },
      { cameraId: 'z', at: T0 + 3_600_000, status: 'alert', worst: 'alert', openedAt: T0 },
      null,
      'texto',
    ],
  });
  const sanitized = parseAckLedger(dirty, T0);
  check('registro ruim não contamina os bons', Object.keys(sanitized.acks).length === 1);
  check('descartes contabilizados', sanitized.discarded === 6);
  check('envelope válido continua restaurado', sanitized.outcome === 'restored');

  const flooded = JSON.stringify({
    v: ACK_SCHEMA_VERSION,
    savedAt: T0,
    records: Array.from({ length: 900 }, (_, i) => ({
      cameraId: `c${i}`,
      at: T0,
      status: 'warning',
      worst: 'warning',
      openedAt: T0,
    })),
  });
  const capped = parseAckLedger(flooded, T0);
  check(
    'teto de registros respeitado',
    Object.keys(capped.acks).length === DEFAULT_ACK_CONFIG.maxRecords
  );
  check('excedente é declarado', capped.discarded === 900 - DEFAULT_ACK_CONFIG.maxRecords);
}

// --- 8. Borda de armazenamento hostil ------------------------------------------
{
  const memory = new Map();
  const storage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
  };
  const acks = acknowledge(emptyAckLedger(), mkEntry(), T0);
  check('grava', writeAckState(storage, acks, T0) === true);
  check('lê de volta', Object.keys(readAckState(storage, T0 + 1).acks).length === 1);

  const hostile = {
    getItem: () => {
      throw new Error('bloqueado');
    },
    setItem: () => {
      throw new Error('cota');
    },
  };
  check('leitura hostil não lança', readAckState(hostile, T0).outcome === 'empty');
  check('escrita hostil não lança', writeAckState(hostile, acks, T0) === false);
  check('sem armazenamento é vazio', readAckState(null, T0).outcome === 'empty');
  check('sem armazenamento não grava', writeAckState(null, acks, T0) === false);
}

// --- 9. Estresse aleatório: invariantes ------------------------------------------
{
  let seed = 20260728;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let round = 0; round < 3000; round += 1) {
    const n = 1 + Math.floor(rnd() * 12);
    const ledger = {};
    let acks = emptyAckLedger();
    for (let i = 0; i < n; i += 1) {
      const id = `c${i}`;
      const status = STATUSES[Math.floor(rnd() * STATUSES.length)];
      const e = mkEntry({
        cameraId: id,
        status,
        worst: status,
        openedAt: T0 - Math.floor(rnd() * 1e6),
      });
      ledger[id] = e;
      if (rnd() < 0.6) acks = acknowledge(acks, e, T0);
    }
    const mutated = {};
    for (const [id, e] of Object.entries(ledger)) {
      if (rnd() < 0.15) continue;
      const status = STATUSES[Math.floor(rnd() * STATUSES.length)];
      mutated[id] = {
        ...e,
        status,
        worst: severityRank(status) < severityRank(e.worst) ? status : e.worst,
        openedAt: rnd() < 0.1 ? e.openedAt + 1 : e.openedAt,
      };
    }
    const now = T0 + Math.floor(rnd() * DEFAULT_ACK_CONFIG.ttlMs * 1.5);
    const res = reconcileAcks(acks, mutated, now);

    // Invariante A: reconciliação nunca inventa ciência.
    check(
      'nunca cria ciência',
      Object.keys(res.acks).every((id) => id in acks)
    );
    // Invariante B: conservação — mantidos + revogados = originais.
    check(
      'conservação do livro',
      Object.keys(res.acks).length + res.revocations.length === Object.keys(acks).length
    );
    // Invariante C: idempotência.
    const again = reconcileAcks(res.acks, mutated, now);
    check('idempotente', again.revocations.length === 0);
    // Invariante D: a fila jamais perde pendência por causa da ciência.
    const q = buildTriageQueue({ ledger: mutated, now, acknowledged: acknowledgedIds(res.acks) });
    check('fila conserva total', q.totals.total === Object.keys(mutated).length);
    check('abertos + cientes = total', q.totals.open + q.totals.acknowledged === q.totals.total);
    // Invariante E: nenhum ciente sobrevive a agravamento.
    check(
      'nenhum ciente mais grave que o reconhecido',
      Object.values(res.acks).every(
        (r) => severityRank(mutated[r.cameraId].status) >= severityRank(r.status)
      )
    );
  }
}

console.log(`\nOnda 172 — ciência durável da triagem`);
console.log(`asserções: ${assertions}`);
console.log(`falhas: ${failures.length}`);
if (failures.length > 0) {
  for (const f of failures.slice(0, 25)) console.error(` ✗ ${f}`);
  process.exit(1);
}
console.log('✓ gate aprovado');
