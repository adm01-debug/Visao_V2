/**
 * Onda 245 — simulação combinatória da estreia visível no painel de expurgo.
 *
 * Varre o produto cartesiano de cadências × idades de registro × execuções ×
 * relógios sujos e confere as invariantes U1–U10 em cada célula. Falha grita.
 */

import {
  evaluateRetentionDebut,
  formatDebutCountdown,
  type RetentionDebutInput,
} from '../src/lib/retention/retentionDebut';
import {
  RETENTION_ROUTINES,
  classifyRetentionHealth,
  retentionThresholds,
} from '../src/lib/retention/retentionRegistry';

let assertions = 0;
let scenarios = 0;
const failures: string[] = [];

function check(condition: boolean, message: string): void {
  assertions += 1;
  if (!condition) failures.push(message);
}

const NOW = Date.parse('2026-07-29T18:00:00.000Z');
const MIN = 60_000;

const cadences = [1, 5, 60, 240, 1440, 10080];
// Idades de registro em minutos, incluindo as fronteiras exatas da carência.
const registrationOffsets = [null, -1, 0, 1, 14, 15, 59, 60, 74, 75, 76, 1439, 1454, 1455, 1456, 100000];
const lastRunOffsets: (number | null)[] = [null, 0, 1, 30, 135, 1000, 5761, 999999];
const dirtyAnchors = [null, '', 'não é data', '2026-13-45T00:00:00Z'];
const reportedHealths = [null, 'ok', 'never', 'pending_first_run', 'stalled'];

for (const cadence of cadences) {
  const { debutAfterMinutes } = retentionThresholds(cadence);

  for (const regOffset of registrationOffsets) {
    for (const lastOffset of lastRunOffsets) {
      for (const reported of reportedHealths) {
        scenarios += 1;
        const registeredAt =
          regOffset === null ? null : new Date(NOW - regOffset * MIN).toISOString();
        const lastRun = lastOffset === null ? null : new Date(NOW - lastOffset * MIN).toISOString();
        const row: RetentionDebutInput = {
          cadenceMinutes: cadence,
          lastRun,
          registeredAt,
          reportedHealth: reported,
        };
        const view = evaluateRetentionDebut(row, NOW);

        // U3 — execução anula a estreia.
        if (lastRun !== null) {
          check(view.stage === 'not_applicable', `U3 violada (cadência ${cadence}, exec ${lastOffset})`);
          check(view.minutesRemaining === null, 'U3: contagem regressiva com execução presente');
          check(view.health !== 'pending_first_run', 'U3: estreia vazando com execução presente');
        } else if (regOffset === null || regOffset < 0) {
          // U4/U5 — sem âncora ou âncora no futuro.
          check(view.stage === 'no_anchor', `U4/U5 violada (registro ${regOffset})`);
          check(view.health === 'never', 'U4: falta de prova precisa manter o crítico');
          check(view.minutesRemaining === null, 'U4: contagem regressiva sem âncora');
        } else if (regOffset < debutAfterMinutes) {
          // U6 — dentro da carência.
          check(view.stage === 'pending', `U6 violada dentro da carência (${regOffset}/${debutAfterMinutes})`);
          check(view.health === 'pending_first_run', 'U6: saúde deveria ser estreia pendente');
          check(
            view.minutesRemaining !== null && view.minutesRemaining >= 1,
            'U7/U10: restante precisa ser inteiro positivo',
          );
          check(
            view.minutesRemaining !== null &&
              view.minutesRemaining <= Math.ceil(debutAfterMinutes - regOffset),
            'U10: arredondamento para cima excedeu o restante real',
          );
          check(typeof formatDebutCountdown(view) === 'string', 'U10: rótulo de contagem ausente');
        } else {
          // U6 — fronteira fechada à esquerda.
          check(view.stage === 'overdue', `U6 violada no vencimento (${regOffset}/${debutAfterMinutes})`);
          check(view.health === 'never', 'U6: estreia vencida precisa ser crítica');
          check(view.minutesRemaining === null, 'U6: vencido não tem contagem');
          check(formatDebutCountdown(view) === null, 'U10: vencido não exibe contagem');
        }

        // U8 — vencimento ancorado no registro.
        if (registeredAt !== null) {
          check(
            view.dueAt === new Date(Date.parse(registeredAt) + debutAfterMinutes * MIN).toISOString(),
            'U8: vencimento não derivado do registro',
          );
          const later = evaluateRetentionDebut(row, NOW + 37 * MIN);
          check(later.dueAt === view.dueAt, 'U8: vencimento se moveu com o relógio de leitura');
        }

        // U9 — divergência declarada, nunca silenciada.
        check(
          view.mismatch === (reported !== null && reported !== view.health),
          'U9: divergência de saúde mal declarada',
        );

        // Paridade com a régua canônica da Onda 244.
        const expectedHealth = classifyRetentionHealth(
          lastOffset === null ? null : lastOffset,
          cadence,
          regOffset === null || regOffset < 0 ? null : regOffset,
        );
        check(view.health === expectedHealth, `paridade com classifyRetentionHealth quebrada (${cadence}/${regOffset}/${lastOffset})`);
      }
    }
  }
}

// --- Relógio e cadência sujos (U1/U2) -----------------------------------------
for (const anchor of dirtyAnchors) {
  scenarios += 1;
  const view = evaluateRetentionDebut(
    { cadenceMinutes: 1440, lastRun: null, registeredAt: anchor },
    NOW,
  );
  check(view.stage === 'no_anchor', `U4: âncora suja '${anchor}' deveria ser sem âncora`);
  check(view.health === 'never', 'U4: âncora suja precisa manter o crítico');
  check(view.dueAt === null, 'U8: âncora suja não pode produzir vencimento');
}

for (const cadence of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  scenarios += 1;
  const view = evaluateRetentionDebut(
    { cadenceMinutes: cadence, lastRun: null, registeredAt: '2026-07-29T17:00:00.000Z' },
    NOW,
  );
  check(view.stage === 'unknown', `U2: cadência ${cadence} deveria ser desconhecida`);
  check(view.minutesRemaining === null, 'U2: desconhecido não tem contagem');
}

for (const clock of [Number.NaN, Number.POSITIVE_INFINITY]) {
  scenarios += 1;
  const view = evaluateRetentionDebut(
    { cadenceMinutes: 1440, lastRun: null, registeredAt: '2026-07-29T17:00:00.000Z' },
    clock,
  );
  check(view.stage === 'unknown', 'U1: relógio ilegível deveria ser desconhecido');
}

// --- Rotinas reais do registro -------------------------------------------------
for (const routine of RETENTION_ROUTINES) {
  scenarios += 1;
  const view = evaluateRetentionDebut(
    {
      cadenceMinutes: routine.cadenceMinutes,
      lastRun: null,
      registeredAt: routine.registeredAt,
    },
    NOW,
  );
  check(
    view.stage === 'pending' || view.stage === 'overdue',
    `rotina real ${routine.jobName} caiu em estágio inesperado: ${view.stage}`,
  );
  check(view.dueAt !== null, `rotina real ${routine.jobName} sem vencimento calculável`);
}

if (failures.length > 0) {
  console.error(`❌ Onda 245: ${failures.length} violações em ${scenarios} cenários:`);
  for (const failure of failures.slice(0, 25)) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `✅ Onda 245: ${scenarios} cenários / ${assertions} asserções — estreia visível sem mentir sobre prazo.`,
);
