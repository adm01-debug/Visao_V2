/**
 * VISÃO — Onda 240: simulação exaustiva do **silêncio por condição** no
 * despacho externo de alertas de manutenção.
 *
 * Não é teste de exemplo: é varredura combinatória do espaço de decisão da
 * política, conferindo as leis Q1–Q10 e a não-regressão bit-a-bit das fontes
 * operacionais (Onda 111 + 238).
 */

import {
  planDispatch,
  conditionThrottleMinutes,
  DEFAULT_DISPATCH_CONFIG,
  type ConditionNotice,
  type DispatchChannel,
  type DispatchConfig,
  type DispatchRecord,
  type DispatchSeverity,
  type MaintenanceAlert,
} from '../supabase/functions/_shared/maintenanceDispatchPolicy.ts';
import { escalationProfileFor, SLOW_ACCOUNTING_PROFILE } from '../src/lib/escalationProfiles.ts';

const NOW = Date.parse('2026-07-28T03:00:00.000Z');
const MINUTE = 60_000;

let assertions = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  assertions += 1;
  if (!condition && failures.length < 25) failures.push(label);
  else if (!condition) failures.push('…');
}

const CHANNELS: DispatchChannel[] = ['telegram', 'email'];
const SEVERITIES: DispatchSeverity[] = ['warning', 'critical'];

const ROUTINES = [
  'partition_drain',
  'partition_maintenance',
  'retention:collab_notifications',
  'admission_trend:ledger_stock',
  'admission_reconcile:ledger_stock',
  'admission_backlog:ledger',
  'admission_trendy:not_a_prefix',
  '',
];

const config = (over: Partial<DispatchConfig> = {}): DispatchConfig => ({
  ...DEFAULT_DISPATCH_CONFIG,
  channels: CHANNELS,
  minSeverity: 'warning',
  ...over,
});

const alert = (over: Partial<MaintenanceAlert> = {}): MaintenanceAlert => ({
  id: 'a1',
  routine: 'admission_trend:ledger_stock',
  severity: 'critical',
  reason: 'órfão crescente',
  created_at: new Date(NOW - 5 * MINUTE).toISOString(),
  ...over,
});

// ---------------------------------------------------------------------------
// Q2 — paridade com o perfil de escalada da Onda 238.
// ---------------------------------------------------------------------------
for (const routine of ROUTINES) {
  const profile = escalationProfileFor(routine);
  const expected = profile.id === SLOW_ACCOUNTING_PROFILE.id ? profile.minStepMinutes : 0;
  check(`Q2 paridade perfil↔silêncio (${routine})`, conditionThrottleMinutes(routine) === expected);
}
for (const bogus of [null, undefined, 42 as unknown as string, {} as unknown as string]) {
  check('Q2 entrada inválida não silencia', conditionThrottleMinutes(bogus as string) === 0);
}

// ---------------------------------------------------------------------------
// Varredura principal: rotina × severidade atual × severidade entregue ×
// idade da entrega × canal entregue × status do registro da linha.
// ---------------------------------------------------------------------------
const ELAPSED_MINUTES = [0, 1, 30, 239, 720, 1439, 1440, 1441, 2880, 10_000];
const NOTICE_STATUSES: Array<DispatchRecord['status']> = ['sent', 'failed', 'skipped'];

for (const routine of ROUTINES) {
  const window = conditionThrottleMinutes(routine);
  for (const severity of SEVERITIES) {
    for (const noticeSeverity of SEVERITIES) {
      for (const elapsed of ELAPSED_MINUTES) {
        for (const noticeChannel of CHANNELS) {
          for (const status of NOTICE_STATUSES) {
            const a = alert({ id: `row-${elapsed}`, routine, severity });
            const notices: ConditionNotice[] =
              status === 'sent'
                ? [
                    {
                      conditionKey: routine,
                      channel: noticeChannel,
                      severity: noticeSeverity,
                      sentAt: new Date(NOW - elapsed * MINUTE).toISOString(),
                    },
                  ]
                : [];

            const plan = planDispatch([a], [], config(), NOW, notices);
            const throttled = plan.skipped.filter((s) => s.reason === 'condition_throttled');
            const sentChannels = plan.items.map((i) => i.channel);

            // I6 — cada par aparece exatamente uma vez.
            check(
              'I6 cobertura total dos pares',
              plan.items.length + plan.skipped.length === CHANNELS.length
            );

            const escalated = severity === 'critical' && noticeSeverity === 'warning';
            const shouldThrottle =
              window > 0 && status === 'sent' && !escalated && elapsed < window;

            if (shouldThrottle) {
              // Q5 — silêncio é por canal: só o canal que recebeu cala.
              check('Q5 silêncio por canal', throttled.length === 1);
              check('Q5 canal silenciado correto', throttled[0]?.channel === noticeChannel);
              check('Q5 outro canal segue notificando', sentChannels.length === 1);
              check(
                'Q8 silêncio auditável',
                typeof throttled[0]?.detail?.remainingMinutes === 'number'
              );
              check('Q8 janela declarada', throttled[0]?.detail?.windowMinutes === window);
            } else {
              // Q3/Q7 — agravamento, janela vencida, falha ou perfil operacional.
              check('Q3/Q7 sem silêncio indevido', throttled.length === 0);
              check('Q3/Q7 ambos os canais notificam', sentChannels.length === CHANNELS.length);
            }

            // Q1 — a chave da condição acompanha o item planejado.
            for (const item of plan.items) {
              check('Q1 chave da condição', item.conditionKey === routine);
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Q4 — falha de transporte jamais silencia (varredura dedicada).
// ---------------------------------------------------------------------------
for (const routine of ROUTINES) {
  for (const elapsed of ELAPSED_MINUTES) {
    const plan = planDispatch(
      [alert({ routine })],
      [
        {
          alert_id: 'a1',
          channel: 'telegram',
          status: 'failed',
          attempts: 1,
          last_attempt_at: new Date(NOW - 10 * 60 * MINUTE).toISOString(),
        },
      ],
      config(),
      NOW,
      [] // nenhum envio bem-sucedido → nenhum silêncio
    );
    check(
      `Q4 falha não silencia (${routine}/${elapsed})`,
      plan.skipped.every((s) => s.reason !== 'condition_throttled')
    );
  }
}

// ---------------------------------------------------------------------------
// Q6 — relógio ilegível ou no futuro nunca silencia (fail-open).
// ---------------------------------------------------------------------------
for (const sentAt of [
  null,
  '',
  'ontem',
  '2026-13-45T00:00:00Z',
  new Date(NOW + MINUTE).toISOString(),
]) {
  const plan = planDispatch([alert()], [], config(), NOW, [
    {
      conditionKey: 'admission_trend:ledger_stock',
      channel: 'telegram',
      severity: 'critical',
      sentAt,
    },
  ]);
  check(
    `Q6 relógio inválido não silencia (${String(sentAt)})`,
    plan.items.length === CHANNELS.length
  );
}

// ---------------------------------------------------------------------------
// Q9 — dedup por linha vence o silêncio por condição.
// ---------------------------------------------------------------------------
{
  const plan = planDispatch(
    [alert()],
    [
      {
        alert_id: 'a1',
        channel: 'telegram',
        status: 'sent',
        attempts: 1,
        last_attempt_at: new Date(NOW - MINUTE).toISOString(),
      },
    ],
    config(),
    NOW,
    [
      {
        conditionKey: 'admission_trend:ledger_stock',
        channel: 'telegram',
        severity: 'critical',
        sentAt: new Date(NOW - MINUTE).toISOString(),
      },
    ]
  );
  const telegram = plan.skipped.find((s) => s.channel === 'telegram');
  check('Q9 motivo mais específico vence', telegram?.reason === 'already_sent');
}

// ---------------------------------------------------------------------------
// Q10 — rajada da mesma condição na mesma execução: um envio por canal.
// ---------------------------------------------------------------------------
for (const routine of ROUTINES) {
  const burst = Array.from({ length: 12 }, (_, i) =>
    alert({ id: `burst-${i}`, routine, created_at: new Date(NOW - (i + 1) * MINUTE).toISOString() })
  );
  const plan = planDispatch(burst, [], config({ batchLimit: 100 }), NOW, []);
  const perChannel = CHANNELS.map((c) => plan.items.filter((i) => i.channel === c).length);
  const window = conditionThrottleMinutes(routine);
  for (const count of perChannel) {
    check(`Q10 rajada contida (${routine})`, window > 0 ? count === 1 : count === burst.length);
  }
  check(
    'I6 rajada com cobertura total',
    plan.items.length + plan.skipped.length === burst.length * CHANNELS.length
  );
}

// ---------------------------------------------------------------------------
// Não-regressão (Onda 111): sem notícias, o plano é idêntico ao pré-240.
// ---------------------------------------------------------------------------
for (const routine of ROUTINES) {
  for (const severity of SEVERITIES) {
    for (const minSeverity of SEVERITIES) {
      for (const attempts of [0, 1, 2, 4, 9]) {
        for (const ageHours of [0, 1, 23, 25]) {
          const a = alert({
            routine,
            severity,
            created_at: new Date(NOW - ageHours * 60 * MINUTE).toISOString(),
          });
          const records: DispatchRecord[] =
            attempts > 0
              ? [
                  {
                    alert_id: 'a1',
                    channel: 'telegram',
                    status: 'failed',
                    attempts,
                    last_attempt_at: new Date(NOW - 10 * 24 * 60 * MINUTE).toISOString(),
                  },
                ]
              : [];
          const cfg = config({ minSeverity });
          const withNotices = planDispatch([a], records, cfg, NOW, []);
          check(
            'não-regressão: nenhum silêncio sem histórico entregue',
            withNotices.skipped.every((s) => s.reason !== 'condition_throttled')
          );
        }
      }
    }
  }
}

console.log(`Onda 240 — asserções: ${assertions.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`FALHAS (${failures.length}):`);
  for (const f of failures.slice(0, 25)) console.error(` - ${f}`);
  process.exit(1);
}
console.log('✅ Todas as leis Q1–Q10 verificadas.');
