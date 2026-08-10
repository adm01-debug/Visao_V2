#!/usr/bin/env node
/**
 * Onda 181 — simulação exaustiva da ponte agregação → livro de reincidência.
 *
 * Executa a agregação real e a ponte real sobre sequências aleatórias de
 * reportes e verifica, a cada passo, as invariantes que garantem que o
 * histórico de reincidência é fiel aos episódios que realmente ocorreram.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wave181-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  [
    `export * from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/alarmAggregation.ts'))};`,
    `export * from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/alarmRecurrence.ts'))};`,
    `export * from ${JSON.stringify(join(process.cwd(), 'src/lib/alarms/alarmEpisodeBridge.ts'))};`,
  ].join('\n')
);
execFileSync(
  'npx',
  [
    'esbuild',
    entry,
    '--bundle',
    '--format=esm',
    '--platform=node',
    `--outfile=${join(dir, 'b.mjs')}`,
  ],
  { stdio: 'pipe' }
);
const M = await import(join(dir, 'b.mjs'));
const {
  applySourceReport,
  rearmOnConnect,
  emptyEpisode,
  emptyRecurrenceLedger,
  bridgeAggregation,
  reconcileLedger,
} = M;

let assertions = 0;
const failures = [];
const check = (cond, msg) => {
  assertions += 1;
  if (!cond) failures.push(msg);
};

// PRNG determinística (mulberry32) — cenário reproduzível.
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const makeRule = (sourceCount, alwaysOn) => ({
  id: 'r1',
  enabled: true,
  sourceIds: Array.from({ length: sourceCount }, (_, i) => `s${i}`),
  schedule: alwaysOn ? null : [[{ startMinute: 0, endMinute: 1439 }]],
});

const SEQUENCES = 6000;
const STEPS = 40;

for (let seq = 0; seq < SEQUENCES; seq += 1) {
  const rnd = mulberry32(seq * 7919 + 13);
  const sourceCount = 1 + Math.floor(rnd() * 3);
  const rule = makeRule(sourceCount, rnd() < 0.5);
  const severity = SEVERITIES[Math.floor(rnd() * SEVERITIES.length)];
  const seriesKey = `r1:${seq}`;

  let state = emptyEpisode();
  let ledger = emptyRecurrenceLedger(seriesKey);
  let clock = Date.UTC(2026, 6, 28, 9, 0, 0);
  const commandLog = [];
  let opensSeen = 0;
  let closesSeen = 0;

  for (let step = 0; step < STEPS; step += 1) {
    clock += Math.floor(rnd() * 120_000);
    const before = ledger;
    const beforeTotal = ledger.totalEpisodes;
    const beforeChatter = ledger.totalChatter;

    let result;
    const roll = rnd();
    if (roll < 0.08) {
      // Primeiro contato / reconexão.
      const reports = rule.sourceIds.map((id) => ({
        sourceId: id,
        state: rnd() < 0.5 ? 'active' : 'clear',
        at: clock,
      }));
      result = rearmOnConnect(rule, state, reports, clock);
    } else {
      const sourceId =
        rnd() < 0.1 ? 'ghost' : rule.sourceIds[Math.floor(rnd() * rule.sourceIds.length)];
      const reportState = rnd() < 0.5 ? 'active' : 'clear';
      // 10% dos carimbos são retrocedidos, para exercitar `stale_report`.
      const at = rnd() < 0.1 ? clock - Math.floor(rnd() * 300_000) : clock;
      result = applySourceReport(rule, state, { sourceId, state: reportState, at });
    }

    state = result.state;
    const outcome = bridgeAggregation(ledger, result, { seriesKey, severity });
    ledger = outcome.ledger;
    commandLog.push(...outcome.commands);

    // Invariante 1: evento ignorado nunca move o livro.
    if (result.ignored !== null) {
      check(outcome.commands.length === 0, `seq${seq} passo${step}: ignorado emitiu comando`);
      check(ledger === before, `seq${seq} passo${step}: ignorado mutou o livro`);
    }

    // Invariante 4: comando existe se e somente se o livro mudou.
    const ledgerChanged =
      ledger.totalEpisodes !== beforeTotal ||
      ledger.totalChatter !== beforeChatter ||
      ledger.openIndex !== before.openIndex;
    check(
      outcome.commands.length === 0 ? true : ledgerChanged,
      `seq${seq} passo${step}: comando sem mudança no livro`
    );
    check(outcome.commands.length <= 1, `seq${seq} passo${step}: mais de um comando por transição`);

    // Invariante 2: rearme nunca abre episódio quando o livro já tem um aberto.
    if (result.transition === 'rearmed' && before.openIndex !== null) {
      check(
        outcome.skipped === 'rearm_already_recorded' && outcome.commands.length === 0,
        `seq${seq} passo${step}: rearme duplicou episódio`
      );
    }

    // Invariante 3: carimbo do comando é o carimbo do fato.
    for (const cmd of outcome.commands) {
      if (cmd.kind === 'open') {
        check(cmd.at === state.openedAt, `seq${seq} passo${step}: abertura com carimbo alheio`);
        opensSeen += 1;
      } else {
        check(
          cmd.at === state.lastAcceptedAt,
          `seq${seq} passo${step}: fechamento com carimbo alheio`
        );
        closesSeen += 1;
      }
    }

    // Acumulados nunca decrementam (regra 4 da Onda 179).
    check(ledger.totalEpisodes >= beforeTotal, `seq${seq} passo${step}: totalEpisodes decresceu`);
    check(ledger.totalChatter >= beforeChatter, `seq${seq} passo${step}: totalChatter decresceu`);

    // Episódio aberto nunca tem duração (regra 3 da Onda 179).
    if (ledger.openIndex !== null) {
      const open = ledger.episodes[ledger.openIndex];
      check(
        open.closedAt === null && open.durationMs === null,
        `seq${seq} passo${step}: episódio aberto com duração`
      );
    }
    // No máximo um aberto.
    check(
      ledger.episodes.filter((e) => e.closedAt === null).length <= 1,
      `seq${seq} passo${step}: mais de um episódio aberto`
    );
    // Nunca fecha antes de abrir.
    check(closesSeen <= opensSeen, `seq${seq} passo${step}: fechamentos > aberturas`);
  }

  // Reconciliação: depois dela, agregação e livro concordam sobre "há alarme".
  const rec = reconcileLedger(ledger, state, { seriesKey, severity });
  const finalLedger = rec.ledger;
  const aggOpen = state.openedAt !== null;
  const ledOpen = finalLedger.openIndex !== null;
  if (aggOpen || state.lastAcceptedAt !== null) {
    check(
      aggOpen === ledOpen,
      `seq${seq}: reconciliação não convergiu (agg=${aggOpen} livro=${ledOpen})`
    );
  }
  check(rec.commands.length <= 1, `seq${seq}: reconciliação emitiu mais de um comando`);

  // Idempotência: reconciliar de novo não produz comando.
  const again = reconcileLedger(finalLedger, state, { seriesKey, severity });
  check(again.commands.length === 0, `seq${seq}: reconciliação não é idempotente`);

  // Comandos em ordem não decrescente de carimbo (o livro barra retrocesso).
  for (let i = 1; i < commandLog.length; i += 1) {
    check(
      commandLog[i].at >= commandLog[i - 1].at,
      `seq${seq}: comandos fora de ordem cronológica`
    );
  }
  // Alternância estrita abre/fecha.
  for (let i = 1; i < commandLog.length; i += 1) {
    check(
      commandLog[i].kind !== commandLog[i - 1].kind,
      `seq${seq}: comandos repetidos (${commandLog[i].kind})`
    );
  }
  if (commandLog.length > 0) {
    check(commandLog[0].kind === 'open', `seq${seq}: primeira escrita não foi abertura`);
  }
}

// Entradas degeneradas nunca lançam.
const degenerate = [
  [null, null, { seriesKey: 'k', severity: 'low' }],
  [
    emptyRecurrenceLedger('k'),
    { transition: 'opened', ignored: null, state: null },
    { seriesKey: 'k', severity: 'low' },
  ],
  [
    emptyRecurrenceLedger('k'),
    { transition: 'opened', ignored: null, state: emptyEpisode() },
    { seriesKey: '', severity: 'low' },
  ],
  [
    emptyRecurrenceLedger('k'),
    { transition: 'opened', ignored: null, state: emptyEpisode() },
    { seriesKey: 'k', severity: 'nope' },
  ],
];
for (const [l, r, i] of degenerate) {
  let threw = false;
  try {
    bridgeAggregation(l, r, i);
  } catch {
    threw = true;
  }
  check(!threw, 'entrada degenerada lançou exceção');
}

if (failures.length > 0) {
  console.error(`❌ Onda 181 falhou: ${failures.length} de ${assertions} asserções`);
  for (const f of failures.slice(0, 20)) console.error('   -', f);
  process.exit(1);
}
console.log(
  `✅ Onda 181: ponte agregação→reincidência OK — ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`
);
