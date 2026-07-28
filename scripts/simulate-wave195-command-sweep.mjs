#!/usr/bin/env node
/**
 * Simulação Onda 195 — varredura de ordens abandonadas.
 *
 * Não valida "o código roda": valida que as invariantes continuam verdadeiras
 * em TODO o espaço de estados possível da fila, e não só nos casos que alguém
 * lembrou de escrever como teste.
 *
 * Matriz: estado × prazo × instante de entrega × contagem de tentativas ×
 * instante de corte. Para cada retrato, sete invariantes são verificadas.
 *
 * Rodar: node --experimental-strip-types scripts/simulate-wave195-command-sweep.mjs
 */

import { judgeSweep, planSweep } from '../src/lib/devices/commandSweep.ts';
import {
  DELIVERY_LEASE_MS,
  MAX_DELIVERY_ATTEMPTS,
} from '../src/lib/devices/remoteCommandDelivery.ts';

const NOW = 1_800_000_000_000;
const L = DELIVERY_LEASE_MS;

const STATUSES = [
  'queued',
  'awaiting_presence',
  'delivered',
  'completed',
  'failed',
  'expired',
  'cancelled',
  'teleported', // estado desconhecido: a varredura não pode adivinhar
];
const OPEN = new Set(['queued', 'awaiting_presence', 'delivered']);

// Offsets escolhidos para cair exatamente nas bordas (<=, >=) além dos meios.
const EXPIRY_OFFSETS = [-L * 10, -1, 0, 1, L, L * 5, 1_800_000];
const DELIVERED_OFFSETS = [null, -L * 10, -L - 1, -L, -L + 1, -1, 0, 1, L];
const ATTEMPTS = [0, 1, 2, MAX_DELIVERY_ATTEMPTS];
const CUT_DRIFTS = [0, 1, 1_000, 60_000, 600_000];

let assertions = 0;
const failures = [];

const check = (ok, label, ctx) => {
  assertions += 1;
  if (!ok && failures.length < 20) failures.push(`${label} :: ${JSON.stringify(ctx)}`);
  else if (!ok) failures.push(label);
};

const snapshot = [];

for (const status of STATUSES) {
  for (const eo of EXPIRY_OFFSETS) {
    for (const dof of DELIVERED_OFFSETS) {
      for (const attempts of ATTEMPTS) {
        for (const drift of CUT_DRIFTS) {
          const now = NOW + drift;
          const c = {
            id: `s|${status}|${eo}|${dof}|${attempts}|${drift}`,
            status,
            expiresAt: NOW + eo,
            deliveredAt: dof === null ? null : NOW + dof,
            deliveryAttempts: attempts,
          };
          snapshot.push(c);
          const v = judgeSweep(c, now);
          const ctx = { ...c, now };

          // I. Estado terminal e estado desconhecido são sempre inertes.
          if (!OPEN.has(status)) {
            check(v.nextStatus === null && v.reason === 'settled', 'terminal tocado', ctx);
            continue;
          }

          // II. A varredura nunca produz sucesso.
          check(v.nextStatus !== 'completed', 'varredura inventou sucesso', ctx);

          // III. Prazo vencido sempre encerra como vencido, e nunca como falha.
          if (c.expiresAt <= now) {
            check(v.nextStatus === 'expired', 'ordem vencida ficou viva', ctx);
            check(
              v.reason === (status === 'delivered' ? 'expired_in_flight' : 'expired_undelivered'),
              'motivo de vencimento trocado',
              ctx,
            );
            continue;
          }

          // IV. Dentro do prazo e fora do estado entregue: sempre viva.
          if (status !== 'delivered') {
            check(v.reason === 'alive' && v.nextStatus === null, 'fila viva foi encerrada', ctx);
            continue;
          }

          // V. Empréstimo correndo é execução em andamento — nunca abandono.
          const leaseEnd = (c.deliveredAt ?? 0) + L;
          if (leaseEnd > now) {
            check(v.reason === 'alive', 'empréstimo vivo foi encerrado', ctx);
            continue;
          }

          // VI. Abandono exige as duas condições ao mesmo tempo.
          if (attempts >= MAX_DELIVERY_ATTEMPTS) {
            check(
              v.reason === 'delivery_exhausted' && v.nextStatus === 'failed',
              'órfão não foi encerrado (equipamento seguiria bloqueado)',
              ctx,
            );
          } else {
            check(
              v.reason === 'alive' && v.nextStatus === null,
              'ordem com reentrega pendente foi encerrada',
              ctx,
            );
          }

          // VII. Determinismo: o mesmo retrato produz sempre o mesmo veredito.
          check(
            JSON.stringify(judgeSweep(c, now)) === JSON.stringify(v),
            'veredito não determinístico',
            ctx,
          );
        }
      }
    }
  }
}

// --- Plano em lote ----------------------------------------------------------
for (const limit of [0, 1, 7, 100, 10_000]) {
  const plan = planSweep(snapshot, NOW, limit);
  check(plan.verdicts.length === snapshot.length, 'plano perdeu ordens', { limit });
  check(plan.actions.length <= limit, 'lote estourou o teto', { limit });
  check(
    plan.actions.every((a) => a.nextStatus !== null),
    'lote incluiu ordem que não deve ser tocada',
    { limit },
  );
  const total = Object.values(plan.counts).reduce((a, b) => a + b, 0);
  check(total === snapshot.length, 'contagem não fecha com o retrato', { limit });

  // Idempotência: aplicar o plano e varrer de novo não produz ação nova.
  const applied = snapshot.map((c) => {
    const hit = plan.actions.find((a) => a.id === c.id);
    return hit ? { ...c, status: hit.nextStatus } : c;
  });
  const second = planSweep(applied, NOW, limit);
  check(
    second.actions.length === Math.min(limit, Math.max(0, plan.counts.expired_undelivered + plan.counts.expired_in_flight + plan.counts.delivery_exhausted - plan.actions.length)),
    'segunda passada não convergiu',
    { limit },
  );
}

// --- Monotonicidade no tempo ------------------------------------------------
// Uma ordem encerrada por varredura em t nunca "revive" em t+dt.
for (const c of snapshot.slice(0, 5_000)) {
  const early = judgeSweep(c, NOW);
  if (early.nextStatus === null) continue;
  for (const dt of [1, 1_000, 3_600_000]) {
    const later = judgeSweep(c, NOW + dt);
    check(later.nextStatus !== null, 'ordem encerrada reviveu com o tempo', { id: c.id, dt });
  }
}


// --- Fuzz determinístico (PRNG semeado) -------------------------------------
// A matriz cobre as bordas; o fuzz cobre o miolo, com relógios e prazos
// arbitrários, inclusive combinações incoerentes vindas de dados legados.
let seed = 195_0195;
const rnd = () => {
  seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
  return seed / 0x1_0000_0000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

for (let i = 0; i < 120_000; i += 1) {
  const status = pick(STATUSES);
  const now = NOW + Math.floor((rnd() - 0.5) * 7_200_000);
  const c = {
    id: `f${i}`,
    status,
    expiresAt: NOW + Math.floor((rnd() - 0.5) * 3_600_000),
    deliveredAt: rnd() < 0.15 ? null : NOW + Math.floor((rnd() - 0.5) * 3_600_000),
    deliveryAttempts: Math.floor(rnd() * 5),
  };
  const v = judgeSweep(c, now);
  const ctx = { ...c, now };

  check(v.nextStatus !== 'completed', 'fuzz: varredura inventou sucesso', ctx);
  check(['expired', 'failed', null].includes(v.nextStatus), 'fuzz: estado final ilegal', ctx);

  if (!OPEN.has(status)) {
    check(v.nextStatus === null, 'fuzz: terminal tocado', ctx);
    continue;
  }
  if (c.expiresAt <= now) {
    check(v.nextStatus === 'expired', 'fuzz: vencida ficou viva', ctx);
    continue;
  }
  if (status !== 'delivered' || (c.deliveredAt ?? 0) + L > now) {
    check(v.nextStatus === null, 'fuzz: ordem viva encerrada', ctx);
    continue;
  }
  check(
    (c.deliveryAttempts >= MAX_DELIVERY_ATTEMPTS) === (v.nextStatus === 'failed'),
    'fuzz: abandono sem as duas condições',
    ctx,
  );
}

if (failures.length > 0) {
  console.error(failures.slice(0, 20).join('\n'));
  console.error(`\n❌ Onda 195 — ${failures.length} falhas em ${assertions} asserções.`);
  process.exit(1);
}

console.log(
  `\n✅ Onda 195 — varredura de ordens abandonadas: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`,
);
