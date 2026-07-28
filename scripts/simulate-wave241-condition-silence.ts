/**
 * Onda 241 — varredura combinatória do silêncio visível por condição.
 *
 * O que se prova aqui (leis R1–R10):
 *  R2  perfil operacional NUNCA produz silêncio (não-regressão pré-240);
 *  R3  despacho `failed`/`skipped` nunca cala;
 *  R4  warning entregue + condição crítica ⇒ `escalation_breaks`, nunca calado;
 *  R5  relógio ilegível ou futuro ⇒ fail-open (sem silêncio);
 *  R6  o restante exibido é o do canal que ainda demora mais a falar;
 *  R7  condição sem entrega nunca é silenciada;
 *  R8  alerta reconhecido nunca exibe silêncio;
 *  R9  restante ∈ [0, janela] e monotonicamente decrescente no tempo;
 *  R10 canal desconhecido é descartado.
 *
 * Rodar: npx tsx scripts/simulate-wave241-condition-silence.ts
 */

import {
  buildConditionSilence,
  conditionSilenceWindowMinutes,
  indexConditionNotices,
  type ConditionNoticeRow,
} from '../src/lib/maintenance/conditionSilence';
import {
  buildMaintenanceConsole,
  type MaintenanceAlertRow,
} from '../src/lib/maintenance/maintenanceConsoleView';
import type { MaintenanceSeverity } from '../src/lib/maintenanceEscalation';

let assertions = 0;
let failures = 0;

function check(condition: boolean, message: string): void {
  assertions += 1;
  if (!condition) {
    failures += 1;
    if (failures <= 20) console.error(`✗ ${message}`);
  }
}

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const MIN = 60_000;

const ROUTINES = [
  'admission_trend:ledger_stock',
  'admission_reconcile:ledger_stock',
  'admission_backlog:ledger',
  'partition_maintenance',
  'partition_drain',
  'relay_redelivery',
  '',
];
const CHANNELS = ['telegram', 'email', 'sms', ''];
const STATUSES = ['sent', 'failed', 'skipped'];
const SEVERITIES: MaintenanceSeverity[] = ['warning', 'critical'];
const AGES_MIN = [0, 1, 30, 720, 1439, 1440, 1441, 5000, -60];

// ── Varredura 1: uma entrega, um canal ────────────────────────────────────────
for (const routine of ROUTINES) {
  const window = conditionSilenceWindowMinutes(routine);
  const slow = routine.startsWith('admission_');
  check(slow ? window === 1440 : window === 0, `R2 janela ${routine || '(vazia)'} = ${window}`);

  for (const channel of CHANNELS) {
    for (const status of STATUSES) {
      for (const notified of SEVERITIES) {
        for (const current of SEVERITIES) {
          for (const age of AGES_MIN) {
            const sentAt = new Date(NOW - age * MIN).toISOString();
            const notices: ConditionNoticeRow[] = [
              { conditionKey: routine, channel, severity: notified, status, sentAt },
            ];
            const index = indexConditionNotices(notices, NOW);
            const view = buildConditionSilence(routine, current, index, NOW);

            const usable =
              window > 0 &&
              status === 'sent' &&
              (channel === 'telegram' || channel === 'email') &&
              routine.length > 0 &&
              age >= 0;

            if (!usable) {
              check(view === null, `R2/R3/R5/R7/R10 sem silêncio (${routine}/${channel}/${status}/${age})`);
              continue;
            }

            check(view !== null, `entrega válida deve render view (${routine}/${channel})`);
            if (!view) continue;

            const entry = view.channels[0];
            if (age >= window) {
              check(entry.state === 'expired', `R9 janela vencida expira (${age})`);
              check(view.remainingMinutes === null, 'R9 vencido não tem restante');
            } else if (current === 'critical' && notified === 'warning') {
              check(entry.state === 'escalation_breaks', 'R4 agravamento fura');
              check(view.breaksOnEscalation, 'R4 sinalizado no agregado');
              check(view.silencedChannels === 0, 'R4 agravamento não conta como calado');
            } else {
              check(entry.state === 'silenced', `R9 dentro da janela cala (${age})`);
              check(
                view.remainingMinutes !== null &&
                  view.remainingMinutes > 0 &&
                  view.remainingMinutes <= window,
                'R9 restante dentro do intervalo',
              );
            }
          }
        }
      }
    }
  }
}

// ── Varredura 2: dois canais, restante é o maior (R6) ────────────────────────
for (const ageTelegram of [0, 100, 700, 1439]) {
  for (const ageEmail of [0, 100, 700, 1439]) {
    const routine = 'admission_trend:ledger_stock';
    const notices: ConditionNoticeRow[] = [
      {
        conditionKey: routine,
        channel: 'telegram',
        severity: 'critical',
        status: 'sent',
        sentAt: new Date(NOW - ageTelegram * MIN).toISOString(),
      },
      {
        conditionKey: routine,
        channel: 'email',
        severity: 'critical',
        status: 'sent',
        sentAt: new Date(NOW - ageEmail * MIN).toISOString(),
      },
    ];
    const view = buildConditionSilence(
      routine,
      'critical',
      indexConditionNotices(notices, NOW),
      NOW,
    );
    check(view !== null && view.silencedChannels === 2, 'R6 dois canais calados');
    const expected = 1440 - Math.min(ageTelegram, ageEmail);
    check(
      view !== null && Math.abs((view.remainingMinutes ?? -1) - expected) < 0.2,
      `R6 restante = maior espera (${expected})`,
    );
  }
}

// ── Varredura 3: monotonicidade no tempo (R9) ────────────────────────────────
{
  const routine = 'admission_backlog:ledger';
  const sentAt = new Date(NOW - 10 * MIN).toISOString();
  const notices: ConditionNoticeRow[] = [
    { conditionKey: routine, channel: 'telegram', severity: 'critical', status: 'sent', sentAt },
  ];
  let previous = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= 1500; step += 7) {
    const now = NOW + step * MIN;
    const view = buildConditionSilence(routine, 'critical', indexConditionNotices(notices, now), now);
    const remaining = view?.remainingMinutes ?? 0;
    check(remaining <= previous + 1e-9, `R9 restante nunca cresce (t+${step})`);
    check(remaining >= 0, 'R9 restante nunca negativo');
    previous = remaining;
  }
  check(previous === 0, 'R9 silêncio termina');
}

// ── Varredura 4: integração com o console (R8 e agregados) ───────────────────
function alertRow(over: Partial<MaintenanceAlertRow>): MaintenanceAlertRow {
  return {
    id: 'a1',
    routine: 'admission_trend:ledger_stock',
    severity: 'critical',
    reason: 'órfão crescendo',
    detail: null,
    created_at: new Date(NOW - 3 * 1440 * MIN).toISOString(),
    observed_at: null,
    acknowledged_at: null,
    acknowledged_by: null,
    escalation_level: 1,
    last_escalated_at: null,
    ...over,
  };
}

for (const acknowledged of [null, new Date(NOW - 5 * MIN).toISOString()]) {
  const rows = [alertRow({ acknowledged_at: acknowledged })];
  const notices: ConditionNoticeRow[] = [
    {
      conditionKey: 'admission_trend:ledger_stock',
      channel: 'telegram',
      severity: 'critical',
      status: 'sent',
      sentAt: new Date(NOW - 60 * MIN).toISOString(),
    },
  ];
  const model = buildMaintenanceConsole(rows, NOW, undefined, notices);
  const view = model.rows[0];
  if (acknowledged === null) {
    check(view.silence !== null, 'R8 aberto exibe silêncio');
    check(model.summary.silenced === 1, 'resumo conta calado');
  } else {
    check(view.silence === null, 'R8 reconhecido não exibe silêncio');
    check(model.summary.silenced === 0, 'resumo não conta reconhecido');
  }
}

// Não-regressão: console sem `notices` é idêntico ao pré-241 (silence null).
{
  const rows = [alertRow({}), alertRow({ id: 'a2', routine: 'partition_drain' })];
  const model = buildMaintenanceConsole(rows, NOW);
  check(
    model.rows.every((row) => row.silence === null),
    'não-regressão: sem entregas não há silêncio',
  );
  check(model.summary.silenced === 0, 'não-regressão: resumo zerado');
}

console.log(`\nOnda 241 — ${assertions.toLocaleString('pt-BR')} asserções, ${failures} falhas`);
if (failures > 0) process.exit(1);
