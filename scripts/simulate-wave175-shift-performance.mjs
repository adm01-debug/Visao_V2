#!/usr/bin/env node
/**
 * Onda 175 — gate de simulação do desempenho de atendimento do turno.
 *
 * Varre milhares de combinações de relógio de atenção, ciência (dentro/fora do
 * turno, de outra janela), herança e relógio torto, verificando as invariantes
 * declaradas em src/lib/emap/shiftPerformance.ts.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'wave175-'));
const entryFile = join(tmp, 'entry.mjs');
const abs = (p) => join(process.cwd(), p).replace(/\\/g, '/');
writeFileSync(entryFile, `export * from '${abs('src/lib/emap/shiftPerformance.ts')}';\n`);
const out = join(tmp, 'bundle.mjs');
execFileSync(
  'npx',
  ['esbuild', entryFile, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, '--log-level=error'],
  { stdio: 'inherit' },
);
const { buildShiftPerformance, formatPerformanceReport, formatCompliance } = await import(
  `file://${out}`
);

let checks = 0;
let failures = 0;
const fail = (msg) => {
  failures += 1;
  if (failures <= 20) console.error('✗', msg);
};
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fail(msg);
};

const STATUSES = ['alert', 'offline', 'warning', 'unknown'];
const MIN = 60 * 1000;
const SHIFT = 1_000_000;

const entry = (cameraId, status, openedAt, now) => ({
  cameraId,
  status,
  since: openedAt,
  openedAt,
  worst: status,
  changes: 0,
  lastSeen: now,
});

// ── 1. Invariantes gerais sobre malha ampla ────────────────────────────────
for (const status of STATUSES) {
  for (const openedOffset of [-30 * MIN, -MIN, 0, MIN, 5 * MIN]) {
    for (const ackOffset of [null, -20 * MIN, -MIN, 0, MIN, 3 * MIN, 20 * MIN]) {
      for (const elapsed of [0, 30 * 1000, MIN, 4 * MIN, 30 * MIN]) {
        const openedAt = SHIFT + openedOffset;
        const now = SHIFT + Math.max(openedOffset, 0) + elapsed;
        const e = entry('cam-a', status, openedAt, now);
        const acks =
          ackOffset == null
            ? {}
            : {
                'cam-a': {
                  cameraId: 'cam-a',
                  at: SHIFT + ackOffset,
                  status,
                  worst: status,
                  openedAt,
                },
              };
        const perf = buildShiftPerformance({
          ledger: { 'cam-a': e },
          acks,
          startedAt: SHIFT,
          now,
        });

        ok(perf.decided === perf.met + perf.late, 'decided = met + late');
        // Regra 4: sem amostra não existe nota.
        ok(
          perf.decided > 0 ? typeof perf.compliance === 'number' : perf.compliance === null,
          'conformidade só com amostra',
        );
        ok(
          perf.decided > 0 || perf.mttaMs === null,
          'MTTA nulo sem atendimento concluído',
        );
        // Regra 1: pendência aberta jamais entra na média.
        if (perf.items[0].verdict.state === 'breached' || perf.items[0].verdict.state === 'on_time' ||
            perf.items[0].verdict.state === 'due_soon') {
          ok(perf.mttaMs === null, 'aberto não alimenta MTTA');
        }
        // Regra 2: atribuição pelo instante da ciência.
        const item = perf.items[0];
        if (item.verdict.frozen && item.verdict.frozenAt != null) {
          const inWindow = item.verdict.frozenAt >= SHIFT && item.verdict.frozenAt <= now;
          ok(item.attributedToShift === inWindow, 'atribuição pela janela da ciência');
        } else {
          ok(item.attributedToShift === false, 'sem ciência não há atribuição');
        }
        // Regra 3: vencido herdado nunca é somado ao do turno.
        ok(
          perf.breachedInShift + perf.inheritedBreached === perf.byState.breached,
          'vencidos particionados exatamente',
        );
        if (openedAt < SHIFT) {
          ok(perf.breachedInShift === 0, 'janela herdada nunca conta como vencido do turno');
        } else {
          ok(perf.inheritedBreached === 0, 'janela do turno nunca vira herança');
        }
        // Regra 5: nada negativo.
        ok(
          item.timeToAckMs === null || item.timeToAckMs >= 0,
          'tempo até ciência nunca negativo',
        );
        ok(perf.worstOverdueMs >= 0, 'atraso nunca negativo');
        // Regra 6: determinismo.
        const again = buildShiftPerformance({
          ledger: { 'cam-a': e },
          acks,
          startedAt: SHIFT,
          now,
        });
        ok(
          JSON.stringify(again) === JSON.stringify(perf),
          'saída determinística para a mesma entrada',
        );
        ok(typeof formatPerformanceReport(perf) === 'string', 'relatório sempre textual');
      }
    }
  }
}

// ── 2. Ciência de outra janela é inerte ────────────────────────────────────
for (const drift of [1, 1000, 60_000]) {
  const openedAt = SHIFT + MIN;
  const now = openedAt + 10 * MIN;
  const perf = buildShiftPerformance({
    ledger: { 'cam-b': entry('cam-b', 'alert', openedAt, now) },
    acks: {
      'cam-b': {
        cameraId: 'cam-b',
        at: openedAt + MIN,
        status: 'alert',
        worst: 'alert',
        openedAt: openedAt - drift,
      },
    },
    startedAt: SHIFT,
    now,
  });
  ok(perf.decided === 0, 'ciência de outra janela não conclui atendimento');
  ok(perf.mttaMs === null, 'ciência de outra janela não alimenta MTTA');
  ok(perf.byState.breached === 1, 'pendência segue vencida sem ciência válida');
}

// ── 3. Relógio para trás não vira desempenho ───────────────────────────────
{
  const openedAt = SHIFT + 10 * MIN;
  const now = openedAt + MIN;
  const perf = buildShiftPerformance({
    ledger: { 'cam-c': entry('cam-c', 'alert', openedAt, now) },
    acks: {
      'cam-c': { cameraId: 'cam-c', at: openedAt - 5 * MIN, status: 'alert', worst: 'alert', openedAt },
    },
    startedAt: SHIFT,
    now,
  });
  const item = perf.items[0];
  ok(item.timeToAckMs === null || item.timeToAckMs >= 0, 'drift negativo descartado, nunca zerado à força');
  ok(perf.mttaMs === null || perf.mttaMs >= 0, 'MTTA nunca negativo');
}

// ── 4. Média é média mesmo: agregação multi-câmera ─────────────────────────
{
  const now = SHIFT + 60 * MIN;
  const ledger = {};
  const acks = {};
  const durations = [MIN, 3 * MIN, 5 * MIN];
  durations.forEach((d, i) => {
    const id = `cam-${i}`;
    const openedAt = SHIFT + 10 * MIN;
    ledger[id] = entry(id, 'warning', openedAt, now);
    acks[id] = { cameraId: id, at: openedAt + d, status: 'warning', worst: 'warning', openedAt };
  });
  const perf = buildShiftPerformance({ ledger, acks, startedAt: SHIFT, now });
  const expected = durations.reduce((a, b) => a + b, 0) / durations.length;
  ok(perf.mttaMs === expected, `MTTA correto (${perf.mttaMs} vs ${expected})`);
  ok(perf.worstAckMs === 5 * MIN, 'pior tempo até ciência correto');
  ok(perf.decided === 3, 'todas as três ciências atribuídas ao turno');
  ok(perf.met + perf.late === 3, 'vereditos concluídos coerentes');
  ok(formatCompliance(perf.compliance).endsWith('%'), 'conformidade formatada');
}

// ── 5. Entrada suja nunca derruba a regra ──────────────────────────────────
for (const bad of [null, undefined, {}, { ledger: null }, { ledger: { x: null } }, { ledger: { x: {} } }]) {
  let threw = false;
  try {
    buildShiftPerformance(bad);
  } catch {
    threw = true;
  }
  ok(!threw, 'entrada inválida não lança');
}
ok(formatCompliance(null) === 'sem amostra', 'sem amostra nunca vira 100%');

console.log(`\nOnda 175 — ${checks} asserções, ${failures} falha(s).`);
process.exit(failures > 0 ? 1 : 0);
