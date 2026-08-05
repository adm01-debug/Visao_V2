#!/usr/bin/env node
/**
 * Onda 106 — Blindagem de partições (RLS automática) + rotinas DBA.
 *
 * Contexto: `public.ensure_future_partitions()` cria as partições mensais de
 * `recognition_logs` / `plate_detections` e aplica GRANT para `authenticated`,
 * mas NÃO habilita RLS nem cria a policy `auth.uid() = user_id`. Como RLS não
 * é herdada pela partição em acesso direto (`SELECT ... FROM partição`), toda
 * partição nova nasceria legível entre tenants.
 *
 * Este script simula a matriz completa antes da migração e classifica cada
 * cenário em safe/unsafe, gravando reports/simulations/wave106.{json,md}.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'reports', 'simulations');

/** Origem da partição. */
const ORIGINS = [
  'existente_backfill',
  'nova_pelo_cron',
  'criada_manualmente',
  'historica_pre_2026',
];
/** Estado de blindagem da partição. */
const STATES = [
  { id: 'rls_on_policy_on_grant_on', rls: true, policy: true, grant: true },
  { id: 'rls_on_policy_off_grant_on', rls: true, policy: false, grant: true },
  { id: 'rls_off_policy_off_grant_on', rls: false, policy: false, grant: true },
  { id: 'rls_off_policy_on_grant_on', rls: false, policy: true, grant: true },
  { id: 'rls_on_policy_on_grant_off', rls: true, policy: true, grant: false },
  { id: 'rls_off_policy_off_grant_off', rls: false, policy: false, grant: false },
];
const ROLES = ['anon', 'auth_owner', 'auth_other_tenant', 'service_role'];
const OPS = ['select_direct', 'select_via_parent', 'insert', 'update', 'delete', 'copy_out'];
const MOMENTS = ['antes_da_virada', 'depois_da_virada'];

/**
 * Modelo de decisão do Postgres para acesso a uma partição.
 * @returns {{outcome: 'denied'|'own_rows'|'all_rows'|'write_ok'|'write_blocked', safe: boolean}}
 */
function evaluate(role, op, state) {
  // anon nunca recebe GRANT nas partições (nem no pai) → permission denied.
  if (role === 'anon') return { outcome: 'denied', safe: true };
  // service_role bypassa RLS por design (workers/cron).
  if (role === 'service_role') return { outcome: 'all_rows', safe: true };

  if (!state.grant) return { outcome: 'denied', safe: true };

  const reading = op === 'select_direct' || op === 'select_via_parent' || op === 'copy_out';
  // Acesso pelo pai: a policy do PAI é aplicada mesmo que a partição não tenha a sua.
  const parentRoute = op === 'select_via_parent';

  if (parentRoute) return { outcome: 'own_rows', safe: true };

  // Acesso direto à partição: só a RLS + policy DA PARTIÇÃO valem.
  if (!state.rls) {
    // RLS desligada na partição → leitura/escrita irrestrita entre tenants.
    return reading
      ? { outcome: 'all_rows', safe: role === 'auth_owner' }
      : { outcome: 'write_ok', safe: role === 'auth_owner' };
  }
  if (!state.policy) {
    // RLS ligada sem policy → deny-all (seguro, mas quebra a aplicação).
    return { outcome: 'denied', safe: true };
  }
  return reading ? { outcome: 'own_rows', safe: true } : { outcome: 'write_ok', safe: true };
}

const scenarios = [];
for (const origin of ORIGINS)
  for (const state of STATES)
    for (const role of ROLES)
      for (const op of OPS)
        for (const moment of MOMENTS) {
          const { outcome, safe } = evaluate(role, op, state);
          scenarios.push({ origin, state: state.id, role, op, moment, outcome, safe });
        }

const total = scenarios.length;
const unsafe = scenarios.filter((s) => !s.safe);

/** Agregação por estado de blindagem. */
const byState = {};
for (const s of scenarios) {
  byState[s.state] ??= { total: 0, safe: 0, unsafe: 0 };
  byState[s.state].total++;
  byState[s.state][s.safe ? 'safe' : 'unsafe']++;
}

const gaps = [
  'ensure_future_partitions() aplica GRANT mas não ENABLE ROW LEVEL SECURITY → partição nova nasce legível entre tenants em acesso direto.',
  'RLS do pai só é aplicada quando a query passa pela tabela particionada; SELECT direto na partição usa a RLS da própria partição.',
  'RLS ligada sem policy vira deny-all: a migração precisa criar a policy no mesmo passo, senão a app quebra em produção.',
  'CREATE POLICY não é idempotente (falha com 42710) — proteger com checagem em pg_policies antes de criar.',
  'Partições criadas manualmente (hotfix/DBA) escapam da função → o gate de CI precisa varrer relispartition, não confiar na função.',
  'service_role permanece com bypass de RLS por design (cron/workers); o gate não deve sinalizar isso como falha.',
  'anon não deve receber GRANT em nenhuma partição — reconferir após cada ALTER na tabela pai.',
];

const summary = {
  wave: 106,
  ran_at: new Date().toISOString(),
  totals: { total, safe: total - unsafe.length, unsafe: unsafe.length },
  by_state: byState,
  unsafe_sample: unsafe.slice(0, 10),
  gaps,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'wave106.json'), `${JSON.stringify(summary, null, 2)}\n`);

const md = `# Onda 106 — Simulação: RLS em partições

**Executado:** ${summary.ran_at}
**Cenários:** ${total}
**Seguros:** ${total - unsafe.length}
**Inseguros:** ${unsafe.length}

## Por estado de blindagem

| Estado | Total | Seguros | Inseguros |
|---|---:|---:|---:|
${Object.entries(byState)
  .map(([k, v]) => `| ${k} | ${v.total} | ${v.safe} | ${v.unsafe} |`)
  .join('\n')}

## Gaps previstos

${gaps.map((g) => `- ${g}`).join('\n')}

## Conclusão

Todos os cenários inseguros pertencem a estados com \`rls_off\` — exatamente o que a
migração da Onda 106 elimina ao ligar RLS + policy dentro de \`ensure_future_partitions\`
e ao adicionar o gate de partições em \`check-rls-exposure.mjs\`.
`;
writeFileSync(resolve(OUT_DIR, 'wave106.md'), md);

console.log(JSON.stringify({ total, unsafe: unsafe.length, by_state: byState }, null, 2));
console.log(
  `\n✅ Onda 106 — ${total} cenários simulados | ${unsafe.length} inseguros (todos em partição sem RLS).`
);
