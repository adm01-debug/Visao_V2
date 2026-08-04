#!/usr/bin/env node
/**
 * Onda 111 — Simulação exaustiva do despacho externo de alertas de manutenção.
 *
 * Gera centenas de combinações de (severidade × idade × histórico de tentativas ×
 * backoff × canais × tamanho de lote) e valida as invariantes I1..I6 da política
 * pura em `supabase/functions/_shared/maintenanceDispatchPolicy.ts`.
 *
 * Uso: `npm run simulate:wave111`
 */
import {
  planDispatch,
  backoffMs,
  renderMessage,
  resolveConfig,
  DEFAULT_DISPATCH_CONFIG,
} from '../supabase/functions/_shared/maintenanceDispatchPolicy.ts';

const NOW = Date.parse('2026-07-26T12:00:00.000Z');
const ROUTINES = ['partition_maintenance', 'partition_drain', 'partition_quarantine'];
const SEVERITIES = ['critical', 'warning'];
const AGES_H = [0, 1, 6, 23.5, 25, 100];
const ATTEMPT_STATES = [
  null,
  { status: 'sent', attempts: 1, lastAgoMin: 60 },
  { status: 'failed', attempts: 1, lastAgoMin: 1 },
  { status: 'failed', attempts: 1, lastAgoMin: 120 },
  { status: 'failed', attempts: 3, lastAgoMin: 5 },
  { status: 'failed', attempts: 4, lastAgoMin: 10_000 },
];
const CHANNEL_SETS = [['telegram'], ['email'], ['telegram', 'email'], []];
const MIN_SEVERITIES = ['critical', 'warning'];
const BATCH_LIMITS = [1, 3, 20];

let scenarios = 0;
const failures = [];

const fail = (name, msg) => failures.push(`${name}: ${msg}`);

for (const routine of ROUTINES) {
  for (const severity of SEVERITIES) {
    for (const ageH of AGES_H) {
      for (const state of ATTEMPT_STATES) {
        for (const channels of CHANNEL_SETS) {
          for (const minSeverity of MIN_SEVERITIES) {
            for (const batchLimit of BATCH_LIMITS) {
              scenarios += 1;
              const name = `${routine}/${severity}/age${ageH}h/${state ? `${state.status}x${state.attempts}@${state.lastAgoMin}m` : 'virgem'}/[${channels}]/min:${minSeverity}/batch:${batchLimit}`;

              const alert = {
                id: `alert-${scenarios}`,
                routine,
                severity,
                reason: 'motivo simulado',
                created_at: new Date(NOW - ageH * 3_600_000).toISOString(),
                detail: {},
              };

              const dispatches = state
                ? channels.map((channel) => ({
                    alert_id: alert.id,
                    channel,
                    status: state.status,
                    attempts: state.attempts,
                    last_attempt_at: new Date(NOW - state.lastAgoMin * 60_000).toISOString(),
                  }))
                : [];

              const config = {
                ...DEFAULT_DISPATCH_CONFIG,
                channels,
                minSeverity,
                batchLimit,
              };

              const plan = planDispatch([alert], dispatches, config, NOW);

              // I6 — cobertura total e sem duplicidade de pares.
              const pairs = [
                ...plan.items.map((i) => `${i.alert.id}:${i.channel}`),
                ...plan.skipped.map((s) => `${s.alertId}:${s.channel}`),
              ];
              if (new Set(pairs).size !== pairs.length) fail(name, 'I6 par duplicado no plano');
              if (pairs.length !== channels.length) fail(name, 'I6 cobertura de pares incompleta');

              // I5 — teto de lote.
              if (plan.items.length > batchLimit) fail(name, 'I5 batchLimit estourado');

              for (const channel of channels) {
                const sent = plan.items.find((i) => i.channel === channel);
                const skip = plan.skipped.find((s) => s.channel === channel);

                // I4 — severidade e idade.
                if (severity === 'warning' && minSeverity === 'critical') {
                  if (sent) fail(name, 'I4 avisou abaixo da severidade mínima');
                  if (skip?.reason !== 'below_min_severity') fail(name, 'I4 motivo de skip errado');
                  continue;
                }
                if (ageH > DEFAULT_DISPATCH_CONFIG.maxAgeHours) {
                  if (sent) fail(name, 'I4 despachou alerta expirado');
                  if (skip?.reason !== 'too_old') fail(name, 'I4 motivo de expiração errado');
                  continue;
                }

                // I1 — nunca reenvia o que já foi entregue.
                if (state?.status === 'sent') {
                  if (sent) fail(name, 'I1 reenviou alerta já entregue');
                  if (skip?.reason !== 'already_sent') fail(name, 'I1 motivo de skip errado');
                  continue;
                }

                // I2 — teto de tentativas.
                if (state && state.attempts >= DEFAULT_DISPATCH_CONFIG.maxAttempts) {
                  if (sent) fail(name, 'I2 excedeu maxAttempts');
                  if (skip?.reason !== 'max_attempts_reached') fail(name, 'I2 motivo errado');
                  continue;
                }

                // I3 — backoff exponencial.
                if (state && state.attempts > 0) {
                  const waited = state.lastAgoMin * 60_000;
                  const required = backoffMs(
                    state.attempts,
                    DEFAULT_DISPATCH_CONFIG.backoffBaseMinutes
                  );
                  if (waited < required) {
                    if (sent) fail(name, 'I3 despachou dentro do backoff');
                    if (skip?.reason !== 'backoff_pending') fail(name, 'I3 motivo errado');
                    continue;
                  }
                }

                // Elegível: ou entra no lote, ou é barrado só pelo teto de lote.
                if (!sent && skip?.reason !== 'batch_limit') {
                  fail(name, `elegível não despachado (skip=${skip?.reason ?? 'nenhum'})`);
                }
                if (sent && sent.attempt !== (state?.attempts ?? 0) + 1) {
                  fail(name, 'contador de tentativa inconsistente');
                }
              }
            }
          }
        }
      }
    }
  }
}

/* --- Cenários de lote: prioridade crítico-primeiro sob saturação ---------- */
{
  const many = Array.from({ length: 50 }, (_, i) => ({
    id: `bulk-${i}`,
    routine: ROUTINES[i % 3],
    severity: i % 2 === 0 ? 'warning' : 'critical',
    reason: 'lote',
    created_at: new Date(NOW - i * 60_000).toISOString(),
  }));
  const config = {
    ...DEFAULT_DISPATCH_CONFIG,
    channels: ['telegram'],
    minSeverity: 'warning',
    batchLimit: 10,
  };
  const plan = planDispatch(many, [], config, NOW);
  scenarios += 1;
  if (plan.items.length !== 10) fail('lote/50', 'batchLimit não respeitado');
  if (!plan.items.every((i) => i.alert.severity === 'critical')) {
    fail('lote/50', 'críticos não foram priorizados sob saturação');
  }
  const overflow = plan.skipped.filter((s) => s.reason === 'batch_limit').length;
  if (overflow !== 40) fail('lote/50', `overflow inesperado: ${overflow}`);
}

/* --- Robustez: timestamps inválidos e ausentes ---------------------------- */
for (const created of ['', 'não-é-data', '0000-00-00']) {
  scenarios += 1;
  const plan = planDispatch(
    [
      {
        id: 'bad',
        routine: 'partition_drain',
        severity: 'critical',
        reason: 'x',
        created_at: created,
      },
    ],
    [],
    { ...DEFAULT_DISPATCH_CONFIG, channels: ['telegram'] },
    NOW
  );
  if (plan.items.length !== 0)
    fail(`data-invalida/${created}`, 'despachou com created_at inválido');
}

/* --- Registros duplicados no histórico (corrida entre execuções) ---------- */
{
  scenarios += 1;
  const alert = {
    id: 'race',
    routine: 'partition_drain',
    severity: 'critical',
    reason: 'x',
    created_at: new Date(NOW - 60_000).toISOString(),
  };
  const plan = planDispatch(
    [alert],
    [
      {
        alert_id: 'race',
        channel: 'telegram',
        status: 'failed',
        attempts: 1,
        last_attempt_at: new Date(NOW - 10_000).toISOString(),
      },
      {
        alert_id: 'race',
        channel: 'telegram',
        status: 'sent',
        attempts: 2,
        last_attempt_at: new Date(NOW - 5_000).toISOString(),
      },
    ],
    { ...DEFAULT_DISPATCH_CONFIG, channels: ['telegram'] },
    NOW
  );
  if (plan.items.length !== 0) fail('corrida', 'reenviou apesar de registro `sent` concorrente');
}

/* --- resolveConfig: canais só existem com credencial ---------------------- */
const ENV_CASES = [
  [{}, 0],
  [{ TELEGRAM_BOT_TOKEN: 't' }, 0],
  [{ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' }, 1],
  [{ RESEND_API_KEY: 'k', MAINTENANCE_ALERT_EMAIL: 'a@b.c' }, 1],
  [
    {
      TELEGRAM_BOT_TOKEN: 't',
      TELEGRAM_CHAT_ID: 'c',
      RESEND_API_KEY: 'k',
      MAINTENANCE_ALERT_EMAIL: 'a@b.c',
    },
    2,
  ],
];
for (const [env, expected] of ENV_CASES) {
  scenarios += 1;
  const cfg = resolveConfig(env);
  if (cfg.channels.length !== expected) {
    fail('resolveConfig', `esperava ${expected} canal(is), obteve ${cfg.channels.length}`);
  }
}
{
  scenarios += 1;
  const cfg = resolveConfig(
    { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' },
    { channels: ['email'] }
  );
  if (cfg.channels.length !== 0)
    fail('resolveConfig', 'canal solicitado sem credencial foi habilitado');
}

/* --- Renderização: sem HTML injetável -------------------------------------- */
{
  scenarios += 1;
  const msg = renderMessage({
    id: 'x',
    routine: 'partition_drain',
    severity: 'critical',
    reason: '<script>alert(1)</script>',
    created_at: new Date(NOW).toISOString(),
  });
  if (msg.html.includes('<script>')) fail('render', 'HTML não escapado na mensagem');
  if (!msg.subject.includes('CRÍTICO')) fail('render', 'assunto sem severidade');
}

/* --- Backoff monotônico ----------------------------------------------------- */
for (let a = 1; a <= 6; a += 1) {
  scenarios += 1;
  if (backoffMs(a, 15) <= 0) fail('backoff', 'janela não positiva');
  if (a > 1 && backoffMs(a, 15) <= backoffMs(a - 1, 15)) fail('backoff', 'não é monotônico');
}

console.log(`Onda 111 — cenários simulados: ${scenarios}`);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} falha(s):`);
  for (const f of failures.slice(0, 30)) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('✅ Invariantes I1..I6 mantidas em todos os cenários.');
