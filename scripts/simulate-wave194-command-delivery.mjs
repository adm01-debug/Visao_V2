/**
 * Onda 194 — simulação exaustiva da coleta e do laudo dos comandos remotos.
 *
 * A regra de entrega é curta, e é exatamente por isso que ela é perigosa: cada
 * atalho aparentemente inocente ("entrega o que estiver na fila", "aceita o
 * laudo que chegar") produz um defeito físico no mundo real — um gravador
 * reiniciando duas vezes, uma ordem vencida executada 40 minutos atrasada, uma
 * fila que parece viva porque reentrega para sempre a um equipamento mudo.
 *
 * Esta simulação varre o produto cartesiano do espaço de estados e cobra as
 * invariantes contra esses defeitos, não contra a implementação.
 *
 * Rodar: node --experimental-strip-types scripts/simulate-wave194-command-delivery.mjs
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const mod = await import(path.join(root, 'src/lib/devices/remoteCommandDelivery.ts'));
const mirror = await import(
  path.join(root, 'supabase/functions/_shared/remoteCommandDelivery.ts')
);

const {
  planPoll,
  judgeReport,
  toDeliveryEnvelope,
  TERMINAL_STATUSES,
  DELIVERY_LEASE_MS,
  MAX_DELIVERY_ATTEMPTS,
} = mod;

let assertions = 0;
const failures = [];

const check = (condition, label, ctx) => {
  assertions += 1;
  if (!condition) {
    if (failures.length < 20) {
      failures.push(`${label} :: ${JSON.stringify(ctx)}`);
    }
  }
};

const STATUSES = [
  'queued',
  'awaiting_presence',
  'delivered',
  'completed',
  'failed',
  'expired',
  'cancelled',
];
const KINDS = ['osd.open', 'osd.apply', 'clock.sync', 'config.read', 'stream.restart', 'device.reboot'];
const NOW = 1_800_000_000_000;

const snap = (over = {}) => ({
  id: over.id ?? 'c1',
  command: over.command ?? 'config.read',
  status: over.status ?? 'queued',
  createdAt: over.createdAt ?? NOW - 60_000,
  expiresAt: over.expiresAt ?? NOW + 600_000,
  deliveredAt: over.deliveredAt ?? null,
  deliveryAttempts: over.deliveryAttempts ?? 0,
});

// ---------------------------------------------------------------------------
// 1. Varredura de ordem única: todo estado × prazo × empréstimo × tentativas.
// ---------------------------------------------------------------------------
const DELTAS = [-600_000, -1_000, -1, 0, 1, 1_000, 59_999, 60_000, 60_001, 600_000];

for (const status of STATUSES) {
  for (const command of KINDS) {
    for (const expiryDelta of DELTAS) {
      for (const deliveredDelta of DELTAS) {
        for (let attempts = 0; attempts <= MAX_DELIVERY_ATTEMPTS; attempts += 1) {
          const s = snap({
            status,
            command,
            expiresAt: NOW + expiryDelta,
            deliveredAt: status === 'delivered' ? NOW + deliveredDelta : null,
            deliveryAttempts: attempts,
          });
          const plan = planPoll([s], NOW);
          const d = plan.decisions[0];
          const ctx = { status, command, expiryDelta, deliveredDelta, attempts, d };

          // Invariante: ordem encerrada nunca é tocada.
          if (TERMINAL_STATUSES.has(status)) {
            check(d.action === 'skip' && !d.persists, 'terminal intocável', ctx);
            check(plan.delivery === null, 'terminal não entrega', ctx);
            continue;
          }

          // Invariante I: prazo vencido nunca é entregue — em nenhum estado.
          if (s.expiresAt <= NOW) {
            check(d.action === 'expire', 'vencida deve expirar', ctx);
            check(plan.delivery === null, 'vencida jamais entregue', ctx);
            continue;
          }

          if (status === 'delivered') {
            const leaseEnd = s.deliveredAt + DELIVERY_LEASE_MS;
            if (NOW < leaseEnd) {
              // Invariante II: empréstimo corrente cala a fila.
              check(d.action === 'hold', 'empréstimo segura', ctx);
              check(plan.delivery === null, 'empréstimo não reentrega', ctx);
            } else if (attempts >= MAX_DELIVERY_ATTEMPTS) {
              // Invariante III: reentrega tem teto.
              check(d.action === 'exhaust', 'teto esgota', ctx);
              check(plan.delivery === null, 'esgotada não entrega', ctx);
            } else {
              check(d.action === 'redeliver', 'empréstimo vencido reentrega', ctx);
              check(plan.delivery?.commandId === s.id, 'reentrega é a entrega', ctx);
              const env = toDeliveryEnvelope(s, {}, plan.delivery);
              check(env.redelivered === true, 'reentrega se declara', ctx);
              check(env.attempt === attempts + 1, 'tentativa incrementa', ctx);
            }
            continue;
          }

          // queued / awaiting_presence viáveis: entregam sempre.
          check(d.action === 'deliver', 'fila viva entrega', ctx);
          check(plan.delivery?.commandId === s.id, 'entrega é a ordem', ctx);
          check(
            d.reason === (status === 'awaiting_presence' ? 'presence_proved' : 'first_delivery'),
            'motivo correto',
            ctx,
          );
          const env = toDeliveryEnvelope(s, { a: 1 }, plan.delivery);
          check(env.redelivered === false, 'primeira entrega não é reentrega', ctx);
          check(env.attempt === attempts + 1, 'tentativa conta', ctx);
          check(env.commandId === s.id && env.command === command, 'envelope fiel', ctx);
          // O envelope não pode carregar dono, trilha ou quem pediu.
          check(
            Object.keys(env).every((k) =>
              ['commandId', 'command', 'payload', 'expiresAt', 'attempt', 'redelivered', 'effectful'].includes(k)
            ),
            'envelope mínimo',
            ctx,
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Filas múltiplas: serialização, FIFO e morte de vencidas atrás da cabeça.
// ---------------------------------------------------------------------------
for (const headStatus of ['queued', 'awaiting_presence', 'delivered']) {
  for (const headLease of [-1, 1, 59_999, 60_001]) {
    for (const tailStatus of STATUSES) {
      for (const tailExpired of [true, false]) {
        for (const headAttempts of [0, MAX_DELIVERY_ATTEMPTS]) {
          const head = snap({
            id: 'a',
            status: headStatus,
            createdAt: NOW - 300_000,
            deliveredAt: headStatus === 'delivered' ? NOW - headLease : null,
            deliveryAttempts: headStatus === 'delivered' ? headAttempts : 0,
          });
          const tail = snap({
            id: 'b',
            status: tailStatus,
            createdAt: NOW - 100_000,
            expiresAt: tailExpired ? NOW - 1 : NOW + 300_000,
          });
          const plan = planPoll([tail, head], NOW);
          const ctx = { headStatus, headLease, tailStatus, tailExpired, headAttempts };

          // Invariante IV: no máximo uma entrega por poll.
          const delivered = plan.decisions.filter(
            (d) => d.action === 'deliver' || d.action === 'redeliver',
          );
          check(delivered.length <= 1, 'no máximo uma entrega', ctx);
          check(
            (plan.delivery === null) === (delivered.length === 0),
            'plano coerente com decisões',
            ctx,
          );

          // FIFO: a cauda só é servida se a cabeça não consumiu a vez.
          if (delivered.length === 1 && delivered[0].commandId === 'b') {
            const headDecision = plan.decisions.find((d) => d.commandId === 'a');
            check(
              headDecision.action === 'expire' ||
                headDecision.action === 'exhaust' ||
                headDecision.action === 'skip',
              'cauda só passa se cabeça saiu',
              { ...ctx, headDecision },
            );
          }

          // Vencida atrás da cabeça morre mesmo sem ser servida.
          if (tailExpired && !TERMINAL_STATUSES.has(tailStatus)) {
            const t = plan.decisions.find((d) => d.commandId === 'b');
            check(t.action === 'expire' && t.persists, 'vencida morre atrás da cabeça', ctx);
          }

          // Toda ordem recebe exatamente uma decisão.
          check(plan.decisions.length === 2, 'uma decisão por ordem', ctx);
          check(new Set(plan.decisions.map((d) => d.commandId)).size === 2, 'sem decisão dupla', ctx);
        }
      }
    }
  }
}

// Determinismo sob embaralhamento: a ordem de leitura não muda o veredito.
const bag = [
  snap({ id: 'x1', createdAt: NOW - 500_000, status: 'queued' }),
  snap({ id: 'x2', createdAt: NOW - 400_000, status: 'delivered', deliveredAt: NOW - 10_000 }),
  snap({ id: 'x3', createdAt: NOW - 300_000, status: 'queued', expiresAt: NOW - 1 }),
  snap({ id: 'x4', createdAt: NOW - 200_000, status: 'completed' }),
];
const baseline = JSON.stringify(planPoll(bag, NOW));
for (let i = 0; i < 5000; i += 1) {
  const shuffled = [...bag].sort(() => (Math.random() < 0.5 ? -1 : 1));
  check(JSON.stringify(planPoll(shuffled, NOW)) === baseline, 'determinístico', { i });
}

// Empate de created_at é desempatado por id — nunca pela ordem de chegada.
for (let i = 0; i < 2000; i += 1) {
  const tie = [
    snap({ id: 'zz', createdAt: NOW - 1000 }),
    snap({ id: 'aa', createdAt: NOW - 1000 }),
  ];
  const p = planPoll(i % 2 === 0 ? tie : [...tie].reverse(), NOW);
  check(p.delivery.commandId === 'aa', 'empate resolvido por id', { i });
}

// ---------------------------------------------------------------------------
// 3. Prestação de contas.
// ---------------------------------------------------------------------------
for (const status of STATUSES) {
  for (const expiryDelta of DELTAS) {
    for (const outcome of ['completed', 'failed']) {
      const s = snap({ status, expiresAt: NOW + expiryDelta, deliveredAt: NOW - 5_000 });
      const v = judgeReport(s, { outcome, now: NOW });
      const ctx = { status, expiryDelta, outcome, v };

      if (TERMINAL_STATUSES.has(status)) {
        check(!v.accepted && v.reason === 'already_settled', 'encerrada não ressuscita', ctx);
      } else if (status !== 'delivered') {
        check(!v.accepted && v.reason === 'never_delivered', 'sem entrega não há laudo', ctx);
      } else if (s.expiresAt <= NOW) {
        check(!v.accepted && v.reason === 'deadline_passed', 'laudo tardio recusado', ctx);
      } else {
        check(v.accepted && v.nextStatus === outcome, 'laudo aceito preserva veredito', ctx);
      }

      // Ordem desconhecida (ou de outro dono) é sempre a mesma recusa.
      const unknown = judgeReport(null, { outcome, now: NOW });
      check(!unknown.accepted && unknown.reason === 'unknown_command', 'silêncio canônico', ctx);
    }
  }
}

// Laudo nunca inventa estado fora do par declarado.
for (let i = 0; i < 20_000; i += 1) {
  const outcome = i % 2 === 0 ? 'completed' : 'failed';
  const v = judgeReport(snap({ status: 'delivered', deliveredAt: NOW - 1 }), { outcome, now: NOW });
  check(v.accepted && ['completed', 'failed'].includes(v.nextStatus), 'estado final legal', { i });
}

// ---------------------------------------------------------------------------
// 4. Ciclo de vida completo: um equipamento mudo nunca fica em loop eterno.
// ---------------------------------------------------------------------------
for (const ttlMinutes of [1, 2, 5, 10, 30]) {
  for (const pollEveryMs of [1_000, 15_000, 61_000, 120_000]) {
    let state = snap({
      id: 'life',
      status: 'queued',
      createdAt: NOW,
      expiresAt: NOW + ttlMinutes * 60_000,
    });
    let clock = NOW;
    let deliveries = 0;
    let settled = null;

    for (let step = 0; step < 400 && settled === null; step += 1) {
      clock += pollEveryMs;
      const plan = planPoll([state], clock);
      const d = plan.decisions[0];
      if (d.action === 'deliver' || d.action === 'redeliver') {
        deliveries += 1;
        state = {
          ...state,
          status: 'delivered',
          deliveredAt: clock,
          deliveryAttempts: state.deliveryAttempts + 1,
        };
      } else if (d.action === 'expire') {
        settled = 'expired';
      } else if (d.action === 'exhaust') {
        settled = 'failed';
      }
    }

    const ctx = { ttlMinutes, pollEveryMs, deliveries, settled };
    check(settled !== null, 'toda ordem termina', ctx);
    check(deliveries <= MAX_DELIVERY_ATTEMPTS, 'nunca ultrapassa o teto', ctx);
    // O prazo mínimo (1 min) é igual ao empréstimo: o vencimento chega antes
    // ou junto do esgotamento — nunca depois.
    check(
      settled === 'expired' || deliveries === MAX_DELIVERY_ATTEMPTS,
      'só esgota após entregar o teto',
      ctx,
    );
  }
}

// ---------------------------------------------------------------------------
// 5. Paridade com o espelho de servidor (byte a byte de comportamento).
// ---------------------------------------------------------------------------
for (const status of STATUSES) {
  for (const command of KINDS) {
    for (const expiryDelta of DELTAS) {
      for (const attempts of [0, 1, 2, 3]) {
        const s = snap({ status, command, expiresAt: NOW + expiryDelta, attempts, deliveredAt: NOW - 30_000 });
        check(
          JSON.stringify(planPoll([s], NOW)) === JSON.stringify(mirror.planPoll([s], NOW)),
          'paridade planPoll',
          { status, command, expiryDelta, attempts },
        );
        check(
          JSON.stringify(judgeReport(s, { outcome: 'completed', now: NOW })) ===
            JSON.stringify(mirror.judgeReport(s, { outcome: 'completed', now: NOW })),
          'paridade judgeReport',
          { status, command, expiryDelta, attempts },
        );
      }
    }
  }
}
check(mirror.DELIVERY_LEASE_MS === DELIVERY_LEASE_MS, 'paridade de empréstimo', {});
check(mirror.MAX_DELIVERY_ATTEMPTS === MAX_DELIVERY_ATTEMPTS, 'paridade de teto', {});

// ---------------------------------------------------------------------------
// 6. Ruído: entradas hostis não derrubam nem confundem a regra.
// ---------------------------------------------------------------------------
const rnd = (n) => Math.floor(Math.random() * n);
for (let i = 0; i < 60_000; i += 1) {
  const n = rnd(6);
  const list = Array.from({ length: n }, (_, k) =>
    snap({
      id: `r${k}`,
      status: STATUSES[rnd(STATUSES.length)],
      command: KINDS[rnd(KINDS.length)],
      createdAt: NOW - rnd(1_000_000),
      expiresAt: NOW - 500_000 + rnd(1_000_000),
      deliveredAt: rnd(2) ? NOW - rnd(300_000) : null,
      deliveryAttempts: rnd(4),
    })
  );
  const plan = planPoll(list, NOW);
  check(plan.decisions.length === n, 'toda ordem julgada', { i, n });
  check(
    plan.decisions.filter((d) => d.action === 'deliver' || d.action === 'redeliver').length <= 1,
    'unicidade sob ruído',
    { i },
  );
  const entregue = plan.delivery
    ? list.find((c) => c.id === plan.delivery.commandId)
    : null;
  if (entregue) {
    check(entregue.expiresAt > NOW, 'nunca entrega vencida sob ruído', { i });
    check(!TERMINAL_STATUSES.has(entregue.status), 'nunca entrega encerrada', { i });
    check(entregue.deliveryAttempts < MAX_DELIVERY_ATTEMPTS, 'nunca entrega esgotada', { i });
  }
}

// ---------------------------------------------------------------------------
console.log(`Onda 194 — asserções: ${assertions.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`FALHAS (${failures.length} exibidas):`);
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('Onda 194 — todas as invariantes de entrega e laudo se sustentaram.');
