#!/usr/bin/env node
/**
 * Onda 118 — simulação exaustiva do controle de admissão de reinícios.
 *
 * Varre o produto cartesiano de tamanho de frota × composição de candidatos ×
 * histórico da janela × política, e verifica as invariantes I1..I11 declaradas
 * em src/lib/agentRestartBudget.ts.
 *
 * Executa contra o TypeScript compilado em memória via tsx-free loader: o
 * módulo é puro e sem dependências, então basta transpilar removendo os tipos.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { transformSync } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../src/lib/agentRestartBudget.ts');
const js = transformSync(readFileSync(src, 'utf8'), { loader: 'ts', format: 'esm' }).code;
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

const {
  planAgentAdmission,
  perRunBudget,
  windowRemaining,
  jitterSecondsFor,
  stableHash32,
  DEFAULT_RESTART_BUDGET_POLICY: P,
} = mod;

let scenarios = 0;
let assertions = 0;
const failures = [];

function check(condition, label, ctx) {
  assertions += 1;
  if (!condition) {
    failures.push(`${label} :: ${JSON.stringify(ctx)}`);
    if (failures.length > 20) {
      console.error('Muitas falhas; abortando.');
      for (const f of failures) console.error(' -', f);
      process.exit(1);
    }
  }
}

const uuid = (n) =>
  `0000000${n}`.slice(-8).replace(/(.{4})(.{4})/, 'aaaaaaaa-bbbb-4ccc-8ddd-$1$2eeee');

function makeCandidates(spec) {
  const out = [];
  let n = 0;
  for (const [action, severity, count] of spec) {
    for (let i = 0; i < count; i += 1) {
      n += 1;
      out.push({
        agentId: uuid(n),
        agentName: `agente-${n}`,
        action,
        severity,
        silentMinutes: n % 7 === 0 ? null : 5 + (n % 90),
        attempts: n % 4,
      });
    }
  }
  return out;
}

const fleetSizes = [0, 1, 2, 3, 4, 5, 8, 12, 20, 33, 60, 120, 300];
const restartCounts = [0, 1, 2, 3, 5, 9, 20, 60];
const nudgeCounts = [0, 1, 4, 17];
const escalateCounts = [0, 2, 9];
const windowUsed = [0, 1, 4, 12, 40];

const policies = [
  P,
  { ...P, maxRestartsPerRun: 1 },
  { ...P, maxRestartFractionPerRun: 1, maxRestartsPerRun: 999 },
  { ...P, breakerFraction: 0.9 },
  { ...P, jitterSpreadSeconds: 0 },
  { ...P, maxRestartsPerWindow: 0, maxRestartFractionPerWindow: 0 },
];

for (const policy of policies) {
  for (const fleetSize of fleetSizes) {
    for (const r of restartCounts) {
      for (const nu of nudgeCounts) {
        for (const es of escalateCounts) {
          for (const used of windowUsed) {
            scenarios += 1;
            const candidates = makeCandidates([
              ['restart', 'critical', r],
              ['nudge', 'warning', nu],
              ['escalate', 'critical', es],
            ]);
            const input = { fleetSize, candidates, restartsInWindow: used, policy };
            const plan = planAgentAdmission(input);
            const ctx = { fleetSize, r, nu, es, used, pol: policy.maxRestartsPerRun };

            const byId = new Map(candidates.map((c) => [c.agentId, c]));

            // I3 — admitidos ⊆ candidatos, sem duplicar nem inventar.
            check(plan.decisions.length === candidates.length, 'I3 cardinalidade', ctx);
            check(
              plan.decisions.every((d) => byId.has(d.agentId)),
              'I3 alvo inexistente',
              ctx
            );
            check(
              new Set(plan.decisions.map((d) => d.agentId)).size === candidates.length,
              'I3 decisão duplicada',
              ctx
            );

            // I1 — nudge e escalate nunca são bloqueados.
            const blockedCheap = plan.decisions.filter(
              (d) => d.action !== 'restart' && d.outcome !== 'admitted'
            );
            check(blockedCheap.length === 0, 'I1 ação barata bloqueada', ctx);

            // I2 / I11 — breaker armado zera reinícios e produz alerta crítico.
            if (plan.breaker.tripped) {
              check(plan.admittedRestarts === 0, 'I2 reinício com breaker armado', ctx);
              check(plan.effectiveBudget === 0, 'I2 orçamento não zerado', ctx);
              check(plan.suppressedRestarts === r, 'I2 supressão incompleta', {
                ...ctx,
                s: plan.suppressedRestarts,
              });
              check(
                plan.alert !== null && plan.alert.severity === 'critical',
                'I11 alerta ausente',
                ctx
              );
            }

            // I4 / I5 — teto por varredura e por janela.
            check(plan.admittedRestarts <= plan.effectiveBudget, 'I4 estouro do orçamento', {
              ...ctx,
              a: plan.admittedRestarts,
              b: plan.effectiveBudget,
            });
            check(plan.effectiveBudget <= plan.windowRemaining, 'I5 estouro da janela', {
              ...ctx,
              e: plan.effectiveBudget,
              w: plan.windowRemaining,
            });
            check(plan.admittedRestarts <= r, 'I4 admitiu mais que pediu', ctx);

            // 6 — nenhuma supressão silenciosa.
            check(
              plan.decisions.every((d) => typeof d.reason === 'string' && d.reason.length > 10),
              '6 motivo ausente',
              ctx
            );

            // I9 — prioridade: nenhum admitido é menos grave que um adiado.
            const admittedRestartDecisions = plan.decisions.filter(
              (d) => d.action === 'restart' && d.outcome === 'admitted'
            );
            const deferred = plan.decisions.filter((d) => d.outcome === 'deferred');
            const worstDeferredRank = Math.min(...deferred.map((d) => d.rank), Infinity);
            check(
              admittedRestartDecisions.every((d) => d.rank < worstDeferredRank),
              'I9 prioridade violada',
              ctx
            );

            // I10 — jitter estável e dentro do intervalo.
            check(
              plan.decisions.every(
                (d) =>
                  d.jitterSeconds >= 0 &&
                  (policy.jitterSpreadSeconds === 0
                    ? d.jitterSeconds === 0
                    : d.jitterSeconds < policy.jitterSpreadSeconds) &&
                  d.jitterSeconds === jitterSecondsFor(d.agentId, policy)
              ),
              'I10 jitter fora do intervalo',
              ctx
            );

            // I7 — determinismo sob permutação da entrada.
            const shuffled = [...candidates].reverse();
            const plan2 = planAgentAdmission({ ...input, candidates: shuffled });
            const norm = (p) =>
              JSON.stringify(
                [...p.decisions]
                  .sort((a, b) => (a.agentId < b.agentId ? -1 : 1))
                  .map((d) => [d.agentId, d.outcome, d.jitterSeconds])
              );
            check(norm(plan) === norm(plan2), 'I7 não determinístico', ctx);
            check(plan.admittedRestarts === plan2.admittedRestarts, 'I7 total instável', ctx);

            // Conservação: toda decisão de reinício cai em exatamente um balde.
            check(
              plan.admittedRestarts + plan.deferredRestarts + plan.suppressedRestarts === r,
              'conservação de reinícios',
              ctx
            );
          }
        }
      }
    }
  }
}

// I8 — monotonicidade do orçamento: aumentar o teto nunca desadmite ninguém.
for (const fleetSize of [5, 12, 60, 300]) {
  for (const r of [1, 3, 9, 20]) {
    const candidates = makeCandidates([['restart', 'critical', r]]);
    let previous = new Set();
    for (let cap = 0; cap <= 25; cap += 1) {
      scenarios += 1;
      const policy = {
        ...P,
        maxRestartsPerRun: cap,
        breakerFraction: 1.01,
        maxRestartsPerWindow: 999,
      };
      const plan = planAgentAdmission({ fleetSize, candidates, restartsInWindow: 0, policy });
      const admitted = new Set(
        plan.decisions.filter((d) => d.outcome === 'admitted').map((d) => d.agentId)
      );
      for (const id of previous) {
        check(admitted.has(id), 'I8 monotonicidade violada', { fleetSize, r, cap, id });
      }
      previous = admitted;
    }
  }
}

// Distribuição do jitter: um hash enviesado recriaria o rebanho que queremos
// dissolver. Exige-se ocupação razoável dos baldes de 60s.
{
  const buckets = new Array(9).fill(0);
  const N = 5000;
  for (let i = 0; i < N; i += 1) {
    const id = `${i}-6f0f2b58-9c1a-4a11-b0de-${String(i).padStart(12, '0')}`;
    buckets[Math.floor(jitterSecondsFor(id, P) / 60)] += 1;
  }
  scenarios += N;
  const expected = N / 9;
  buckets.forEach((count, i) => {
    check(count > expected * 0.75 && count < expected * 1.25, 'jitter enviesado', {
      i,
      count,
      expected,
    });
  });
  check(stableHash32('a') !== stableHash32('b'), 'hash degenerado', {});
  check(stableHash32('mesma') === stableHash32('mesma'), 'hash instável', {});
}

// Cenário narrativo: queda de energia no site com 60 agentes.
{
  scenarios += 1;
  const candidates = makeCandidates([['restart', 'critical', 58]]);
  const plan = planAgentAdmission({ fleetSize: 60, candidates, restartsInWindow: 0 });
  check(plan.breaker.tripped, 'blackout: breaker deveria armar', {});
  check(plan.admittedRestarts === 0, 'blackout: reiniciou a frota', { a: plan.admittedRestarts });
  check(plan.alert?.severity === 'critical', 'blackout: sem alerta crítico', {});
}

// Cenário narrativo: um único agente travado numa frota saudável.
{
  scenarios += 1;
  const candidates = makeCandidates([['restart', 'critical', 1]]);
  const plan = planAgentAdmission({ fleetSize: 60, candidates, restartsInWindow: 0 });
  check(!plan.breaker.tripped, 'agente isolado: breaker armou à toa', {});
  check(plan.admittedRestarts === 1, 'agente isolado: não foi curado', {
    a: plan.admittedRestarts,
  });
  check(plan.alert === null, 'agente isolado: alerta espúrio', { alert: plan.alert });
}

// Cenário narrativo: degradação gradual — 6 agentes doentes de 60.
{
  scenarios += 1;
  const candidates = makeCandidates([['restart', 'critical', 6]]);
  const plan = planAgentAdmission({ fleetSize: 60, candidates, restartsInWindow: 0 });
  check(!plan.breaker.tripped, 'gradual: breaker armou à toa', { f: plan.breaker.fraction });
  check(plan.admittedRestarts === Math.min(6, perRunBudget(60, P)), 'gradual: orçamento errado', {
    a: plan.admittedRestarts,
    b: perRunBudget(60, P),
  });
  check(
    plan.deferredRestarts === 6 - plan.admittedRestarts,
    'gradual: adiamento inconsistente',
    {}
  );
  check(plan.alert?.severity === 'warning', 'gradual: alerta deveria ser aviso', {});
}

// Janela exaurida: nenhuma admissão mesmo sem breaker.
{
  scenarios += 1;
  const candidates = makeCandidates([['restart', 'critical', 2]]);
  const plan = planAgentAdmission({ fleetSize: 60, candidates, restartsInWindow: 99 });
  check(windowRemaining(60, 99, P) === 0, 'janela: saldo deveria ser zero', {});
  check(plan.admittedRestarts === 0, 'janela: admitiu sem saldo', {});
  check(plan.deferredRestarts === 2, 'janela: deveria adiar', {});
}

console.log(`Onda 118 — cenários: ${scenarios.toLocaleString('pt-BR')}`);
console.log(`Onda 118 — asserções: ${assertions.toLocaleString('pt-BR')}`);

if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} invariante(s) violada(s):`);
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('✅ Todas as invariantes I1..I11 preservadas.');
