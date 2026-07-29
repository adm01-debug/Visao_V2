/**
 * Onda 247 — Simulação combinatória do fan-in da mudez do despachante.
 *
 * Percorre o produto cartesiano de estados de entrega × pontualidade × idade ×
 * canais × críticos abertos e afirma, em cada ponto, as invariantes W1–W10.
 * O objetivo não é cobrir "casos que imagino que aconteçam", e sim o espaço de
 * estados inteiro — inclusive combinações que hoje o banco não produz, porque
 * a régua sobrevive às ondas seguintes e será chamada por código que ainda não
 * existe.
 *
 * Execução: `npx tsx scripts/simulate-wave247-deliverability-alert.ts`
 */

import {
  buildDeliverabilityAlert,
  deliverabilityAlertSeverity,
  deliverabilityCooldownMinutes,
  deliverabilityRoutineKey,
  COOLDOWN_CEILING_MINUTES,
  COOLDOWN_FLOOR_MINUTES,
} from '../src/lib/maintenance/deliverabilityAlert.ts';
import type {
  DeliverabilityHealth,
  DeliverabilityVerdict,
  DispatchDelivery,
  DispatchPunctuality,
} from '../src/lib/maintenance/dispatchDeliverability.ts';

let scenarios = 0;
let assertions = 0;
const failures: string[] = [];

function check(condition: boolean, message: string): void {
  assertions += 1;
  if (!condition) failures.push(message);
}

const DELIVERIES: DispatchDelivery[] = [
  'delivering',
  'degraded',
  'failing',
  'muted',
  'idle',
  'unreadable',
  'unknown',
];
const PUNCTUALITIES: DispatchPunctuality[] = ['fresh', 'late', 'stalled', 'unknown'];
const HEALTHS: DeliverabilityHealth[] = ['ok', 'warning', 'unknown', 'critical'];
const AGES: (number | null)[] = [null, 0, 5, 59, 61, 90, 200, 1_500, 20_000];
const CHANNELS: string[][] = [[], ['telegram'], ['email'], ['telegram', 'email']];
const CRITICALS = [0, 1, 7, 205, 10_000, -3, Number.NaN];
const CADENCES = [1, 15, 60, 240, 1_440, 100_000];

const SILENT: ReadonlySet<DispatchDelivery> = new Set<DispatchDelivery>(['delivering', 'idle']);
const COMPROMISED: ReadonlySet<DispatchDelivery> = new Set<DispatchDelivery>([
  'muted',
  'failing',
  'unknown',
  'unreadable',
]);

for (const delivery of DELIVERIES) {
  for (const punctuality of PUNCTUALITIES) {
    for (const health of HEALTHS) {
      for (const minutesSinceRun of AGES) {
        for (const channels of CHANNELS) {
          for (const unnotifiedCritical of CRITICALS) {
            const verdict: DeliverabilityVerdict = {
              punctuality,
              delivery,
              health,
              minutesSinceRun,
              lastRunAt: minutesSinceRun === null ? null : '2026-07-29T15:00:00.000Z',
              channels,
              unnotifiedCritical,
              reasons: [],
            };
            scenarios += 1;

            const alert = buildDeliverabilityAlert(verdict);

            // W7 — saudável e ocioso jamais emitem.
            if (SILENT.has(delivery)) {
              check(alert === null, `W7 violada: ${delivery} emitiu alerta`);
              continue;
            }

            // W1 — todo estado não saudável emite, com severidade derivada.
            check(alert !== null, `W1 violada: ${delivery} não emitiu`);
            if (alert === null) continue;

            const waiting =
              Number.isFinite(unnotifiedCritical) && unnotifiedCritical > 0
                ? unnotifiedCritical
                : 0;

            // W1 — severidade nunca é informada de fora: a função pura e o
            // construtor concordam sempre.
            check(
              alert.severity === deliverabilityAlertSeverity(delivery, unnotifiedCritical),
              `W1 violada: divergência entre severidade pura e construída em ${delivery}`,
            );

            // W3 — canal que existe e não entrega é sempre crítico.
            if (delivery === 'failing') {
              check(alert.severity === 'critical', 'W3 violada: failing não foi crítico');
            }

            // W4/W6 — degradação e livro ilegível nunca escalam a crítico.
            if (delivery === 'degraded' || delivery === 'unreadable') {
              check(
                alert.severity === 'warning',
                `W4/W6 violada: ${delivery} virou ${alert.severity}`,
              );
            }

            // W2/W5 — crítico aberto agrava mudez e ignorância.
            if (delivery === 'muted' || delivery === 'unknown') {
              check(
                alert.severity === (waiting > 0 ? 'critical' : 'warning'),
                `W2/W5 violada: ${delivery} com ${waiting} esperando virou ${alert.severity}`,
              );
            }

            // W8 — cooldown sempre dentro da faixa; crítico nunca mais lento.
            check(
              alert.cooldownMinutes >= COOLDOWN_FLOOR_MINUTES &&
                alert.cooldownMinutes <= COOLDOWN_CEILING_MINUTES,
              `W8 violada: cooldown ${alert.cooldownMinutes} fora da faixa`,
            );

            // W9 — auto-referência é exatamente o conjunto comprometido, e a
            // frase é coerente com a marca (nunca uma sem a outra).
            check(
              alert.selfReferential === COMPROMISED.has(delivery),
              `W9 violada: auto-referência errada em ${delivery}`,
            );
            check(
              alert.selfReferential === alert.reason.includes('não sai por canal externo'),
              `W9 violada: frase incoerente com a marca em ${delivery}`,
            );
            check(
              alert.selfReferential === alert.detail.self_referential,
              `W9 violada: detalhe divergente da marca em ${delivery}`,
            );

            // W10 — a acusação sempre carrega os números.
            check(
              alert.reason.includes(`${waiting} crítico(s) sem aviso`),
              `W10 violada: frase sem contagem de críticos em ${delivery}`,
            );
            check(
              alert.reason.includes('cadência'),
              `W10 violada: frase sem cadência em ${delivery}`,
            );

            // Contagem corrompida nunca vaza para o detalhe nem vira negativa.
            check(
              alert.detail.unnotified_critical === waiting &&
                alert.detail.unnotified_critical >= 0,
              `contagem corrompida vazou: ${alert.detail.unnotified_critical}`,
            );

            // Idade e carimbo nunca são inventados.
            check(
              (alert.detail.minutes_since_run === null) === (minutesSinceRun === null),
              'idade inventada ou perdida no detalhe',
            );
            check(
              (alert.detail.last_run_at === null) === (minutesSinceRun === null),
              'carimbo inventado ou perdido no detalhe',
            );

            // Chave estável: uma fonte só no barramento.
            check(
              alert.routine === deliverabilityRoutineKey(),
              `chave instável: ${alert.routine}`,
            );

            // Canais viajam íntegros, sem alias mutável para o verdict.
            check(
              alert.detail.channels.length === channels.length &&
                alert.detail.channels !== (channels as readonly string[]),
              'canais compartilhados por referência com a entrada',
            );
          }
        }
      }
    }
  }
}

// Faixa de cadência: monotonicidade e ordenação entre severidades.
for (const cadence of CADENCES) {
  scenarios += 1;
  const crit = deliverabilityCooldownMinutes(cadence, 'critical');
  const warn = deliverabilityCooldownMinutes(cadence, 'warning');
  check(crit <= warn, `W8 violada: crítico (${crit}) mais lento que aviso (${warn})`);
  check(
    crit >= COOLDOWN_FLOOR_MINUTES && warn <= COOLDOWN_CEILING_MINUTES,
    `W8 violada: faixa rompida em cadência ${cadence}`,
  );
}

// Cadência inválida falha alto em vez de silenciar.
for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  scenarios += 1;
  let threw = false;
  try {
    deliverabilityCooldownMinutes(bad, 'warning');
  } catch {
    threw = true;
  }
  check(threw, `cadência inválida ${bad} não falhou alto`);
}

if (failures.length > 0) {
  console.error(`❌ Onda 247: ${failures.length} violação(ões)`);
  for (const failure of failures.slice(0, 20)) console.error(`   - ${failure}`);
  process.exit(1);
}

console.log(
  `✅ Onda 247: ${scenarios} cenários / ${assertions} asserções — ` +
    'a mudez se acusa sozinha e nunca mente sobre a própria entrega.',
);
