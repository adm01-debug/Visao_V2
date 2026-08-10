/**
 * Onda 246 — simulação combinatória da prova de entrega do despachante.
 *
 * Varre o produto cartesiano de idades de execução × canais × contabilidades ×
 * relógios sujos × críticos abertos e confere as invariantes V1–V10 em cada
 * célula. O objetivo não é "passar": é encontrar a combinação em que a régua
 * chamaria de saudável um sistema que não avisou ninguém.
 */

import {
  assessDeliverability,
  DISPATCH_CADENCE_MINUTES,
  type DispatchRunRow,
} from '../src/lib/maintenance/dispatchDeliverability';

let assertions = 0;
let scenarios = 0;
const failures: string[] = [];

function check(condition: boolean, message: string): void {
  assertions += 1;
  if (!condition) failures.push(message);
}

const NOW = Date.parse('2026-07-29T15:40:00.000Z');
const MIN = 60_000;

const AGES = [0, 1, 30, 60, 74, 75, 76, 100, 135, 136, 300, 1440, 20_000];
const CHANNEL_SETS: (string[] | null)[] = [
  [],
  ['telegram'],
  ['email'],
  ['telegram', 'email'],
  null,
  ['  '],
  ['telegram', 'telegram'],
];
const OPEN_CRITICALS: (number | null)[] = [null, 0, 1, 12, 480];
// [candidates, planned, skipped, sent, failed]
const BOOKS: (number | null)[][] = [
  [0, 0, 0, 0, 0],
  [3, 3, 0, 3, 0],
  [3, 3, 0, 0, 3],
  [5, 5, 0, 3, 2],
  [9, 0, 9, 0, 0],
  [10, 2, 3, 2, 0],
  [4, null, 0, 1, 0],
  [4, 4, 0, null, 0],
  [-1, 1, 0, 1, 0],
  [null, 2, null, 2, 0],
];

for (const age of AGES) {
  for (const channels of CHANNEL_SETS) {
    for (const book of BOOKS) {
      for (const openCritical of OPEN_CRITICALS) {
        scenarios += 1;
        const [candidates, planned, skipped, sent, failed] = book;
        const row: DispatchRunRow = {
          ran_at: new Date(NOW - age * MIN).toISOString(),
          channels,
          candidates: candidates ?? null,
          planned: planned ?? null,
          sent: sent ?? null,
          failed: failed ?? null,
          skipped: skipped ?? null,
          throttled: 0,
          outcome: 'simulated',
        };
        const v = assessDeliverability([row], openCritical, NOW);
        const tag = `age=${age} ch=${JSON.stringify(channels)} book=${JSON.stringify(book)} crit=${openCritical}`;

        // V1 — jamais "ok" sem prova de execução legível.
        check(v.punctuality !== 'unknown' || v.health !== 'ok', `V1 violada em ${tag}`);

        // V5 — pontualidade é função exclusiva da idade, imune ao livro.
        const expectedPunctuality =
          age <= DISPATCH_CADENCE_MINUTES + 15
            ? 'fresh'
            : age <= DISPATCH_CADENCE_MINUTES * 2 + 15
              ? 'late'
              : 'stalled';
        check(
          v.punctuality === expectedPunctuality,
          `V5 pontualidade errada em ${tag}: ${v.punctuality}`
        );

        // V6 — atraso nunca é engolido por uma entrega bonita.
        if (expectedPunctuality === 'stalled') {
          check(v.health === 'critical', `V6 atraso crítico engolido em ${tag}: ${v.health}`);
        }
        if (expectedPunctuality === 'late') {
          check(v.health !== 'ok', `V6 atraso reportado como ok em ${tag}`);
        }

        // V2 — canal vazio (inclusive só com lixo em branco) é sempre mudez.
        const effectiveChannels = (channels ?? []).map((c) => c.trim()).filter((c) => c !== '');
        const readableBook =
          planned !== null &&
          sent !== null &&
          failed !== null &&
          planned >= 0 &&
          sent >= 0 &&
          failed >= 0;
        const closes =
          candidates === null ||
          skipped === null ||
          candidates < 0 ||
          skipped < 0 ||
          planned === null ||
          candidates === planned + skipped;
        if (readableBook && closes && effectiveChannels.length === 0) {
          check(v.delivery === 'muted', `V2 mudez não detectada em ${tag}: ${v.delivery}`);
          check(v.health !== 'ok', `V2 mudez reportada como ok em ${tag}`);
        }

        // V3 — planejado sem envio jamais é entrega.
        if (
          readableBook &&
          closes &&
          effectiveChannels.length > 0 &&
          (planned ?? 0) > 0 &&
          sent === 0
        ) {
          check(
            v.delivery === 'failing',
            `V3 falha total mal classificada em ${tag}: ${v.delivery}`
          );
          check(v.health === 'critical', `V3 falha total não é crítica em ${tag}`);
        }

        // V10 — nunca inventa nem nega crítico não notificado.
        check(v.unnotifiedCritical >= 0, `V10 contagem negativa em ${tag}`);
        if (openCritical === null) {
          check(v.unnotifiedCritical === 0, `V10 inventou crítico ilegível em ${tag}`);
        }
        if (v.delivery === 'muted' && typeof openCritical === 'number' && openCritical > 0) {
          check(
            v.unnotifiedCritical === openCritical,
            `V10 perdeu os não avisados em ${tag}: ${v.unnotifiedCritical}`
          );
        }
        if (v.delivery === 'delivering' || v.delivery === 'idle') {
          check(v.unnotifiedCritical === 0, `V10 acusou não avisados numa entrega sadia em ${tag}`);
        }

        // Determinismo: a mesma entrada devolve o mesmo veredito.
        const again = assessDeliverability([row], openCritical, NOW);
        check(JSON.stringify(again) === JSON.stringify(v), `determinismo quebrado em ${tag}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Relógios sujos: futuro, ilegível, ausente — nada disso pode comprar frescor.
// ---------------------------------------------------------------------------
const DIRTY_CLOCKS: (string | null)[] = [
  null,
  '',
  '   ',
  'ontem',
  'NaN',
  new Date(NOW + 5 * MIN).toISOString(),
  new Date(NOW + 100_000 * MIN).toISOString(),
];

for (const clock of DIRTY_CLOCKS) {
  for (const openCritical of OPEN_CRITICALS) {
    scenarios += 1;
    const v = assessDeliverability(
      [
        {
          ran_at: clock,
          channels: ['telegram'],
          candidates: 3,
          planned: 3,
          sent: 3,
          failed: 0,
          skipped: 0,
          throttled: 0,
          outcome: 'sent',
        },
      ],
      openCritical,
      NOW
    );
    check(v.punctuality === 'unknown', `V7 relógio sujo comprou frescor: ${String(clock)}`);
    check(v.health === 'unknown', `V7 relógio sujo virou saúde: ${String(clock)} -> ${v.health}`);
    check(v.lastRunAt === null, `V7 relógio sujo virou última execução: ${String(clock)}`);
  }
}

// Uma execução legível antiga sempre vence uma futura ilegítima.
for (const age of AGES) {
  scenarios += 1;
  const v = assessDeliverability(
    [
      {
        ran_at: new Date(NOW + 60 * MIN).toISOString(),
        channels: ['telegram'],
        candidates: 1,
        planned: 1,
        sent: 1,
        failed: 0,
        skipped: 0,
        throttled: 0,
        outcome: 'sent',
      },
      {
        ran_at: new Date(NOW - age * MIN).toISOString(),
        channels: [],
        candidates: 0,
        planned: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        throttled: 0,
        outcome: 'muted',
      },
    ],
    5,
    NOW
  );
  check(v.delivery === 'muted', `V7 execução futura mascarou a mudez (age=${age}): ${v.delivery}`);
  check(v.unnotifiedCritical === 5, `V7 execução futura apagou os não avisados (age=${age})`);
}

// A ordem de chegada das linhas nunca muda o veredito.
const shuffleBase: DispatchRunRow[] = AGES.map((age, index) => ({
  ran_at: new Date(NOW - age * MIN).toISOString(),
  channels: index % 2 === 0 ? ['telegram'] : [],
  candidates: index,
  planned: index,
  sent: index,
  failed: 0,
  skipped: 0,
  throttled: 0,
  outcome: 'x',
}));
const reference = JSON.stringify(assessDeliverability(shuffleBase, 3, NOW));
for (let seed = 0; seed < 200; seed += 1) {
  scenarios += 1;
  const shuffled = [...shuffleBase];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = (seed * 7 + i * 13) % (i + 1);
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  check(
    JSON.stringify(assessDeliverability(shuffled, 3, NOW)) === reference,
    `ordem das linhas alterou o veredito (seed=${seed})`
  );
}

// O cenário real medido em produção em 29/07: cron pontual, zero canal, 12 críticos.
scenarios += 1;
const production = assessDeliverability(
  [
    {
      ran_at: new Date(NOW - 7 * MIN).toISOString(),
      channels: [],
      candidates: 0,
      planned: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      throttled: 0,
      outcome: 'no_channels_configured',
    },
  ],
  12,
  NOW
);
check(
  production.health === 'critical',
  'cenário real de produção não foi classificado como crítico'
);
check(production.punctuality === 'fresh', 'cenário real perdeu a pontualidade do cron');
check(production.delivery === 'muted', 'cenário real não foi classificado como mudez');
check(production.unnotifiedCritical === 12, 'cenário real perdeu a contagem de não avisados');

if (failures.length > 0) {
  console.error(`❌ Onda 246: ${failures.length} violações em ${scenarios} cenários:`);
  for (const failure of failures.slice(0, 25)) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `✅ Onda 246: ${scenarios} cenários / ${assertions} asserções — mudez do despachante não passa por saúde.`
);
