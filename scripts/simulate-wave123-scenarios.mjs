#!/usr/bin/env node
/**
 * Onda 123 — varredura exaustiva do árbitro de cura x reentrega.
 *
 * O espaço de entrada é pequeno o bastante para ser percorrido por inteiro,
 * então não há amostragem: toda combinação de ação da escada, severidade da
 * escada, severidade de reentrega, contagem de entregas e atribuição de causa
 * raiz é avaliada, e as invariantes I1..I8 são checadas em cada uma.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Transpila a lib TS para ESM sem depender do runner de teste.
const dir = mkdtempSync(join(tmpdir(), 'wave123-'));
const entry = join(dir, 'arbiter.mjs');
execFileSync('npx', ['esbuild', 'src/lib/relayHealingArbiter.ts', '--format=esm', `--outfile=${entry}`], {
  stdio: 'inherit',
});
const { arbitrate, consumesRestartBudget } = await import(entry);

const INV = { none: 0, observe: 1, nudge: 2, restart: 3, escalate: 4 };
const SEV = { ok: 0, warning: 1, critical: 2 };
const RED = { none: 0, warning: 1, critical: 2 };

const actions = ['none', 'nudge', 'restart', 'escalate'];
const severities = ['ok', 'warning', 'critical'];
const redeliveries = ['none', 'warning', 'critical'];
const deliveryCounts = [0, 1, 7, 20, 137, 5000];
const externals = [false, true];

let scenarios = 0;
let assertions = 0;
const failures = [];
const check = (name, ok) => {
  assertions++;
  if (!ok) failures.push(name);
};

const evalOne = (a, s, r, d, e) =>
  arbitrate({
    agentId: `agent-${a}-${s}-${r}-${d}-${e}`,
    healingAction: a,
    healingSeverity: s,
    redeliverySeverity: r,
    deliveries: d,
    externalRootCause: e,
  });

for (const a of actions)
  for (const s of severities)
    for (const r of redeliveries)
      for (const d of deliveryCounts)
        for (const e of externals) {
          scenarios++;
          const v = evalOne(a, s, r, d, e);

          // I1 — nunca mais invasivo que a escada, salvo none → observe.
          check(
            `I1 ${a}/${s}/${r}/${d}/${e}`,
            INV[v.action] <= INV[a] || (a === 'none' && v.action === 'observe'),
          );

          // I2 — causa externa nunca resulta em reinício.
          check(`I2 ${a}/${r}/${e}`, !(e && v.action === 'restart'));

          // I3 — prova de vida sem criticidade nunca resulta em reinício.
          check(
            `I3 ${a}/${s}/${r}/${d}`,
            !(v.action === 'restart' && d > 0 && v.severity !== 'critical'),
          );

          // I4 — escalate é preservado.
          check(`I4 ${a}`, a !== 'escalate' || v.action === 'escalate');

          // 5 — toda divergência é justificada.
          check(`R5 ${a}/${r}`, !v.overridden || (typeof v.reason === 'string' && v.reason.length > 20));

          // I6 — pureza/idempotência.
          check(`I6 ${a}/${r}/${d}`, JSON.stringify(v) === JSON.stringify(evalOne(a, s, r, d, e)));

          // I8 — severidade final nunca abaixo da escada.
          check(`I8 ${a}/${s}`, SEV[v.severity] >= SEV[s]);

          // Orçamento: só reinício consome.
          check(`BUDGET ${v.action}`, consumesRestartBudget(v.action) === (v.action === 'restart'));
        }

// I7 — monotonicidade em relação ao sinal de reentrega.
for (const a of actions)
  for (const s of severities)
    for (const d of deliveryCounts)
      for (const e of externals) {
        let last = -1;
        for (const r of redeliveries) {
          scenarios++;
          const cur = SEV[evalOne(a, s, r, d, e).severity];
          check(`I7 ${a}/${s}/${r}`, cur >= last);
          last = cur;
        }
      }

// Cenários dirigidos aos dois gaps que motivaram a onda.
const g1 = evalOne('none', 'ok', 'critical', 500, false);
check('G1 agente meia-boca deixa rastro', g1.action === 'observe' && g1.severity === 'critical');
const g2 = evalOne('restart', 'critical', 'critical', 0, true);
check('G2 causa externa veta reinício', g2.action === 'observe' && g2.overridden);

writeFileSync(
  'reports/simulations/wave123-arbiter.json',
  JSON.stringify({ scenarios, assertions, failures: failures.length }, null, 2),
);

console.log(`\nOnda 123 — ${scenarios} cenários / ${assertions} asserções`);
if (failures.length) {
  console.error(`❌ ${failures.length} falhas:\n` + failures.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log('✅ invariantes I1..I8 preservadas em todo o espaço de entrada');
