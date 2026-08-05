#!/usr/bin/env node
/**
 * Onda 152 — Simulação da escolha de caminho de conectividade.
 *
 * Espelha `src/lib/devices/pathFailover.ts` em JS puro (o gate compara as
 * constantes das duas cópias) e varre milhares de estados procurando violação
 * das invariantes F1..F7 descritas no módulo.
 *
 * Uso: node scripts/simulate-wave152-path-failover.mjs
 */

const PATHS = ['direct', 'port_forward', 'vpn', 'relay'];
const KINDS = ['transport', 'auth', 'config', 'device', 'none'];

const POLICY = {
  quarantineThreshold: 3,
  backoffBaseMs: 30_000,
  backoffCeilingMs: 480_000,
  promotionMinSamples: 10,
  promotionMargin: 0.1,
};

const WILSON_Z = 1.959963984540054;

function wilsonLowerBound(successes, total, z = WILSON_Z) {
  if (total <= 0) return 0;
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return Math.max(0, (centre - margin) / denom);
}

function backoffMs(consecutive) {
  if (consecutive < POLICY.quarantineThreshold) return 0;
  const steps = consecutive - POLICY.quarantineThreshold;
  const factor = Math.min(2 ** Math.min(steps, 30), POLICY.backoffCeilingMs);
  return Math.min(POLICY.backoffBaseMs * factor, POLICY.backoffCeilingMs);
}

const EMPTY = {
  attempts: 0,
  successes: 0,
  consecutiveTransportFailures: 0,
  lastTransportFailureAtMs: null,
  lastFailureKind: 'none',
};

function decide(path, ev, now) {
  const attempts = Math.max(0, ev.attempts);
  const successes = Math.min(Math.max(0, ev.successes), attempts);
  const score = attempts === 0 ? 0 : wilsonLowerBound(successes, attempts);
  const bo = backoffMs(ev.consecutiveTransportFailures);
  const until =
    bo > 0 && ev.lastTransportFailureAtMs !== null ? ev.lastTransportFailureAtMs + bo : null;
  return {
    path,
    score,
    quarantined: until !== null && now < until,
    quarantineUntilMs: until,
    backoffMs: bo,
  };
}

const canon = (p) => PATHS.indexOf(p);

function planFailover(input, now) {
  const configured = PATHS.filter((p) => input.configuredPaths.includes(p));
  if (configured.length === 0) return { order: [], decisions: [], reason: 'no_path_configured' };

  const decisions = new Map(configured.map((p) => [p, decide(p, input.evidence[p] ?? EMPTY, now)]));
  const preferred = configured.includes(input.preferredPath) ? input.preferredPath : null;
  const pd = preferred ? decisions.get(preferred) : null;

  const challenger = configured
    .filter((p) => p !== preferred && !decisions.get(p).quarantined)
    .sort((a, b) => decisions.get(b).score - decisions.get(a).score || canon(a) - canon(b))[0];

  let head;
  let reason;
  if (!preferred || !pd) {
    head = challenger ?? configured[0];
    reason = 'preferred_not_configured';
  } else if (pd.quarantined) {
    head = challenger ?? preferred;
    reason = challenger ? 'preferred_quarantined' : 'preferred_healthy';
  } else if (
    challenger &&
    (input.evidence[challenger] ?? EMPTY).attempts >= POLICY.promotionMinSamples &&
    decisions.get(challenger).score >= pd.score + POLICY.promotionMargin
  ) {
    head = challenger;
    reason = 'promoted_by_evidence';
  } else {
    head = preferred;
    reason = 'preferred_healthy';
  }

  const rest = configured
    .filter((p) => p !== head)
    .sort((a, b) => {
      const da = decisions.get(a);
      const db = decisions.get(b);
      if (da.quarantined !== db.quarantined) return da.quarantined ? 1 : -1;
      if (db.score !== da.score) return db.score - da.score;
      return canon(a) - canon(b);
    });

  const order = [head, ...rest];
  return { order, decisions: order.map((p) => decisions.get(p)), reason };
}

function applyAttempt(ev, outcome, now) {
  const attempts = ev.attempts + 1;
  if (outcome.succeeded) {
    return {
      ...ev,
      attempts,
      successes: ev.successes + 1,
      consecutiveTransportFailures: 0,
      lastFailureKind: 'none',
    };
  }
  const kind = outcome.failureKind ?? 'transport';
  const blames = kind === 'transport';
  return {
    attempts,
    successes: ev.successes,
    consecutiveTransportFailures: blames
      ? ev.consecutiveTransportFailures + 1
      : ev.consecutiveTransportFailures,
    lastTransportFailureAtMs: blames ? now : ev.lastTransportFailureAtMs,
    lastFailureKind: kind,
  };
}

// ---------------------------------------------------------------- invariantes

const violations = [];
let checked = 0;

function check(id, ok, ctx) {
  if (!ok) violations.push({ id, ctx: JSON.stringify(ctx) });
}

function verify(input, now, label) {
  checked += 1;
  const plan = planFailover(input, now);
  const configured = PATHS.filter((p) => input.configuredPaths.includes(p));
  const ctx = {
    label,
    now,
    preferred: input.preferredPath,
    configured,
    order: plan.order,
    reason: plan.reason,
  };

  // F1 — permutação exata
  check('F1', plan.order.length === configured.length, ctx);
  check('F1', new Set(plan.order).size === plan.order.length, ctx);
  check(
    'F1',
    plan.order.every((p) => configured.includes(p)),
    ctx
  );

  // F2 — nunca vazia havendo caminho
  check('F2', configured.length === 0 || plan.order.length > 0, ctx);

  // F3 — quarentena nunca precede caminho saudável
  let sawQuarantine = false;
  for (const d of plan.decisions) {
    if (d.quarantined) sawQuarantine = true;
    else if (sawQuarantine) {
      // exceção legítima: o preferido em quarentena permanece à frente apenas
      // quando não existe alternativa saudável — nesse caso todos estão em
      // quarentena e o laço nunca chega aqui.
      check('F3', false, ctx);
    }
  }

  // F5 — o preferido só perde a cabeça com motivo declarado
  if (configured.includes(input.preferredPath) && plan.order[0] !== input.preferredPath) {
    check(
      'F5',
      plan.reason === 'preferred_quarantined' || plan.reason === 'promoted_by_evidence',
      ctx
    );
  }

  // F6 — determinismo
  const again = planFailover(input, now);
  check('F6', JSON.stringify(again.order) === JSON.stringify(plan.order), ctx);

  return plan;
}

// F7 — recuo monotônico e com teto
for (let n = 0; n <= 40; n += 1) {
  checked += 1;
  const cur = backoffMs(n);
  const next = backoffMs(n + 1);
  check('F7', next >= cur, { n, cur, next });
  check('F7', cur <= POLICY.backoffCeilingMs, { n, cur });
  check('F7', n < POLICY.quarantineThreshold ? cur === 0 : cur > 0, { n, cur });
}

// F4 — erro não-transporte nunca arma quarentena
for (const kind of KINDS.filter((k) => k !== 'transport' && k !== 'none')) {
  let ev = { ...EMPTY };
  for (let i = 0; i < 25; i += 1)
    ev = applyAttempt(ev, { succeeded: false, failureKind: kind }, 1_000 * i);
  checked += 1;
  check('F4', ev.consecutiveTransportFailures === 0, { kind, ev });
  const d = decide('direct', ev, 1_000_000);
  check('F4', d.quarantined === false, { kind, d });
}

// Cenários nomeados -----------------------------------------------------------
const NOW = 1_800_000_000_000;
const named = [
  {
    label: 'preferido saudável mantém a cabeça',
    input: { preferredPath: 'relay', configuredPaths: PATHS, evidence: {} },
    expect: (p) => p.order[0] === 'relay' && p.reason === 'preferred_healthy',
  },
  {
    label: 'preferido em quarentena cede para alternativa',
    input: {
      preferredPath: 'direct',
      configuredPaths: ['direct', 'relay'],
      evidence: {
        direct: {
          ...EMPTY,
          attempts: 5,
          consecutiveTransportFailures: 4,
          lastTransportFailureAtMs: NOW - 1_000,
        },
      },
    },
    expect: (p) => p.order[0] === 'relay' && p.reason === 'preferred_quarantined',
  },
  {
    label: 'quarentena vencida devolve o preferido',
    input: {
      preferredPath: 'direct',
      configuredPaths: ['direct', 'relay'],
      evidence: {
        direct: {
          ...EMPTY,
          attempts: 5,
          consecutiveTransportFailures: 3,
          lastTransportFailureAtMs: NOW - 600_000,
        },
      },
    },
    expect: (p) => p.order[0] === 'direct',
  },
  {
    label: 'único caminho em quarentena continua sendo tentado',
    input: {
      preferredPath: 'relay',
      configuredPaths: ['relay'],
      evidence: {
        relay: {
          ...EMPTY,
          attempts: 9,
          consecutiveTransportFailures: 8,
          lastTransportFailureAtMs: NOW,
        },
      },
    },
    expect: (p) => p.order.length === 1 && p.order[0] === 'relay',
  },
  {
    label: 'amostra pequena não promove alternativa',
    input: {
      preferredPath: 'vpn',
      configuredPaths: ['vpn', 'direct'],
      evidence: {
        vpn: { ...EMPTY, attempts: 100, successes: 70 },
        direct: { ...EMPTY, attempts: 3, successes: 3 },
      },
    },
    expect: (p) => p.order[0] === 'vpn' && p.reason === 'preferred_healthy',
  },
  {
    label: 'evidência ampla promove alternativa',
    input: {
      preferredPath: 'vpn',
      configuredPaths: ['vpn', 'direct'],
      evidence: {
        vpn: { ...EMPTY, attempts: 100, successes: 40 },
        direct: { ...EMPTY, attempts: 100, successes: 98 },
      },
    },
    expect: (p) => p.order[0] === 'direct' && p.reason === 'promoted_by_evidence',
  },
  {
    label: 'preferido não configurado cai na melhor alternativa',
    input: { preferredPath: 'vpn', configuredPaths: ['direct', 'relay'], evidence: {} },
    expect: (p) => p.reason === 'preferred_not_configured' && p.order.length === 2,
  },
  {
    label: 'sem caminho configurado não inventa rota',
    input: { preferredPath: 'vpn', configuredPaths: [], evidence: {} },
    expect: (p) => p.order.length === 0 && p.reason === 'no_path_configured',
  },
  {
    label: 'entrada suja com repetição não duplica a ordem',
    input: {
      preferredPath: 'relay',
      configuredPaths: ['relay', 'relay', 'direct', 'ftp'],
      evidence: {},
    },
    expect: (p) => p.order.length === 2,
  },
  {
    label: 'senha errada não exila nenhum caminho',
    input: {
      preferredPath: 'direct',
      configuredPaths: PATHS,
      evidence: Object.fromEntries(
        PATHS.map((p) => [p, { ...EMPTY, attempts: 30, successes: 0, lastFailureKind: 'auth' }])
      ),
    },
    expect: (p) => p.order[0] === 'direct' && p.decisions.every((d) => !d.quarantined),
  },
];

for (const scenario of named) {
  const plan = verify(scenario.input, NOW, scenario.label);
  checked += 1;
  check('NAMED', scenario.expect(plan), {
    label: scenario.label,
    order: plan.order,
    reason: plan.reason,
  });
}

// Combinatória ----------------------------------------------------------------
const SUBSETS = [];
for (let mask = 0; mask < 16; mask += 1) {
  SUBSETS.push(PATHS.filter((_, i) => (mask >> i) & 1));
}
const FAIL_COUNTS = [0, 2, 3, 5, 9];
const AGES = [0, 20_000, 120_000, 3_600_000];
const RATES = [
  { attempts: 0, successes: 0 },
  { attempts: 8, successes: 8 },
  { attempts: 50, successes: 25 },
  { attempts: 200, successes: 198 },
];

for (const subset of SUBSETS) {
  for (const preferred of PATHS) {
    for (const fails of FAIL_COUNTS) {
      for (const age of AGES) {
        for (const rate of RATES) {
          const evidence = {};
          for (const p of subset) {
            evidence[p] =
              p === preferred
                ? {
                    ...EMPTY,
                    ...rate,
                    consecutiveTransportFailures: fails,
                    lastTransportFailureAtMs: NOW - age,
                  }
                : { ...EMPTY, ...rate };
          }
          verify(
            { preferredPath: preferred, configuredPaths: subset, evidence },
            NOW,
            'combinatoria'
          );
        }
      }
    }
  }
}

// Fuzz determinístico ---------------------------------------------------------
let seed = 0x152152;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

for (let i = 0; i < 1200; i += 1) {
  const subset = PATHS.filter(() => rnd() > 0.35);
  const evidence = {};
  for (const p of subset) {
    const attempts = Math.floor(rnd() * 300);
    evidence[p] = {
      attempts,
      successes: Math.floor(rnd() * (attempts + 1)),
      consecutiveTransportFailures: Math.floor(rnd() * 12),
      lastTransportFailureAtMs: rnd() > 0.15 ? NOW - Math.floor(rnd() * 3_600_000) : null,
      lastFailureKind: pick(KINDS),
    };
  }
  verify({ preferredPath: pick(PATHS), configuredPaths: subset, evidence }, NOW, 'fuzz');
}

// Trajetórias vivas: sequências de tentativas alimentando a evidência ---------
for (let t = 0; t < 300; t += 1) {
  let ev = { ...EMPTY };
  let clock = NOW;
  for (let step = 0; step < 30; step += 1) {
    clock += Math.floor(rnd() * 90_000);
    const succeeded = rnd() > 0.55;
    ev = applyAttempt(ev, { succeeded, failureKind: pick(KINDS) }, clock);
    checked += 1;
    check('TRAJ', ev.successes <= ev.attempts, { ev });
    check('TRAJ', ev.consecutiveTransportFailures >= 0, { ev });
    if (succeeded) check('TRAJ', ev.consecutiveTransportFailures === 0, { ev });
    verify(
      { preferredPath: 'relay', configuredPaths: ['relay', 'direct'], evidence: { relay: ev } },
      clock,
      'trajetoria'
    );
  }
}

// ---------------------------------------------------------------------- saída
console.log(`Onda 152 — cenários verificados: ${checked}`);
if (violations.length > 0) {
  console.error(`VIOLAÇÕES: ${violations.length}`);
  for (const v of violations.slice(0, 10)) console.error(` - [${v.id}] ${v.ctx}`);
  process.exit(1);
}
console.log('Invariantes F1..F7 preservadas em todos os cenários.');
