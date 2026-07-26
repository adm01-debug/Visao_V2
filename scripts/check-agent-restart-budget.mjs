#!/usr/bin/env node
/**
 * Onda 118 — Gate do controle de admissão de reinícios de agentes.
 *
 * Ponto cego que este gate fecha: a política anti-rebanho existe em dois
 * lugares (TypeScript, que a UI e o simulador usam, e PL/pgSQL, que é quem
 * realmente decide). Se os dois divergirem, o painel exibirá um plano que o
 * banco não seguiu — e a divergência só apareceria no dia do incidente, que é
 * exatamente o dia em que ninguém tem tempo de descobrir isso.
 *
 * Falha (exit 1) quando:
 *  - `stable_hash32` do banco discorda de `stableHash32()` do TypeScript
 *    (jitter deixaria de ser reproduzível/auditável);
 *  - `claim_agent_relay_tasks` não respeita `scheduled_at` (o jitter viraria
 *    enfeite: as tarefas sairiam todas juntas de qualquer forma);
 *  - as constantes de política do PL/pgSQL divergem de
 *    DEFAULT_RESTART_BUDGET_POLICY;
 *  - faltam as amarras de integridade (`defer`/`suppress` permitidos e
 *    proibição de tarefa enfileirada em ação bloqueada);
 *  - alguma varredura recente admitiu mais reinícios que o orçamento, ou
 *    admitiu reinício com o disjuntor armado;
 *  - existe ação `defer`/`suppress` apontando para uma tarefa de fila;
 *  - o jitter gravado não corresponde ao hash do agente.
 *
 * Uso: `npm run db:check:restart-budget`
 */
import { execFileSync } from 'node:child_process';
import {
  DEFAULT_RESTART_BUDGET_POLICY as POLICY,
  stableHash32,
  jitterSecondsFor,
  perRunBudget,
} from '../src/lib/agentRestartBudget.ts';

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

/** @param {string} sql @returns {string[][]} */
function query(sql) {
  const args = [...(conn ? [conn] : []), '-tA', '-F', '\u0001', '-X', '-q', '-c', sql];
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\u0001'));
}

const errors = [];
const warnings = [];

// 1) Paridade do hash — base de todo o jitter determinístico.
{
  const samples = ['a', 'mesma', 'agente-42', '9f1c2b58-9c1a-4a11-b0de-000000000001', ''];
  const rows = query(`
    SELECT s, public.stable_hash32(s)::text
    FROM (VALUES ${samples.map((s) => `('${s}')`).join(',')}) v(s)
  `);
  if (rows.length !== samples.length) {
    errors.push('public.stable_hash32(text) não existe ou não retornou todas as amostras');
  } else {
    for (const [input, value] of rows) {
      const expected = String(stableHash32(input));
      if (value !== expected) {
        errors.push(`hash divergente para "${input}": banco=${value} typescript=${expected}`);
      }
    }
  }
}

// 2) O consumidor da fila precisa honrar a liberação escalonada.
{
  // Newlines viram linhas separadas no output do psql -tA; achata antes.
  const [row] = query(`
    SELECT replace(pg_get_functiondef(p.oid), E'\n', ' ')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'claim_agent_relay_tasks'
  `);
  if (!row) {
    errors.push('claim_agent_relay_tasks não existe');
  } else if (!/scheduled_at\s*<=\s*now\(\)/.test(row[0])) {
    errors.push('claim_agent_relay_tasks ignora scheduled_at: o jitter não teria efeito algum');
  }
}

// 3) Paridade das constantes de política entre PL/pgSQL e TypeScript.
{
  const [row] = query(`
    SELECT replace(pg_get_functiondef(p.oid), E'\n', ' ')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'heal_local_agents'
  `);
  if (!row) {
    errors.push('heal_local_agents não existe');
  } else {
    const def = row[0];
    /** @param {string} name @returns {number|null} */
    const constant = (name) => {
      const m = def.match(new RegExp(`${name}\\s+constant\\s+\\w+\\s*:=\\s*([0-9.]+)`));
      return m ? Number(m[1]) : null;
    };
    const expected = [
      ['frac_per_run', POLICY.maxRestartFractionPerRun],
      ['min_per_run', POLICY.minRestartsPerRun],
      ['max_per_run', POLICY.maxRestartsPerRun],
      ['window_min', POLICY.windowMinutes],
      ['frac_per_window', POLICY.maxRestartFractionPerWindow],
      ['max_per_window', POLICY.maxRestartsPerWindow],
      ['breaker_frac', POLICY.breakerFraction],
      ['breaker_min_fleet', POLICY.breakerMinFleet],
      ['breaker_min_aff', POLICY.breakerMinAffected],
      ['jitter_spread', POLICY.jitterSpreadSeconds],
    ];
    for (const [name, want] of expected) {
      const got = constant(name);
      if (got === null) {
        errors.push(`constante ${name} não encontrada em heal_local_agents`);
      } else if (got !== want) {
        errors.push(`política divergente em ${name}: banco=${got} typescript=${want}`);
      }
    }
    if (!/breaker_on\s*:=\s*true/.test(def)) {
      errors.push('heal_local_agents não contém o disjuntor de falha correlacionada');
    }
  }
}

// 4) Amarras de integridade do histórico.
{
  const checks = query(`
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'public.agent_healing_actions'::regclass AND contype = 'c'
  `);
  const joined = checks.map((c) => `${c[0]} ${c[1]}`).join(' | ');
  for (const token of ['defer', 'suppress']) {
    if (!joined.includes(`'${token}'`)) {
      errors.push(`agent_healing_actions não aceita a ação '${token}'`);
    }
  }
  if (!checks.some((c) => c[0] === 'agent_healing_actions_no_task_when_blocked')) {
    errors.push('falta a amarra que impede ação bloqueada apontar para tarefa enfileirada');
  }
}

// 5) Comportamento observado nas varreduras recentes.
{
  const runs = query(`
    SELECT id::text, restarts_requested::text, restarts_admitted::text,
           restarts_deferred::text, restarts_suppressed::text,
           effective_budget::text, breaker_tripped::text, agents_total::text
    FROM public.agent_healing_runs
    WHERE ran_at > now() - interval '7 days' AND ok
    ORDER BY ran_at DESC LIMIT 200
  `);
  for (const [id, req, adm, def, sup, budget, breaker, fleet] of runs) {
    const n = (v) => Number(v);
    if (n(adm) > n(budget)) {
      errors.push(`varredura ${id}: ${adm} reinício(s) admitido(s) com orçamento ${budget}`);
    }
    if (breaker === 'true' && n(adm) > 0) {
      errors.push(`varredura ${id}: disjuntor armado mas ${adm} reinício(s) foram executados`);
    }
    if (n(req) !== n(adm) + n(def) + n(sup)) {
      errors.push(
        `varredura ${id}: contabilidade inconsistente (${req} pedidos ≠ ${adm}+${def}+${sup})`,
      );
    }
    // Orçamento nunca pode exceder o teto por varredura da política.
    const cap = perRunBudget(n(fleet), POLICY);
    if (breaker !== 'true' && n(fleet) > 0 && n(budget) > cap) {
      errors.push(`varredura ${id}: orçamento ${budget} acima do teto ${cap} para frota ${fleet}`);
    }
  }
  if (runs.length === 0) {
    warnings.push('nenhuma varredura de auto-cura nos últimos 7 dias');
  }
}

// 6) Ações bloqueadas não podem ter enfileirado nada, e o jitter tem de ser
//    o hash do agente — é isso que torna a decisão auditável a posteriori.
{
  const bad = query(`
    SELECT count(*)::text FROM public.agent_healing_actions
    WHERE action IN ('defer','suppress','escalate') AND task_id IS NOT NULL
  `);
  if (bad[0] && Number(bad[0][0]) > 0) {
    errors.push(`${bad[0][0]} ação(ões) bloqueada(s) com tarefa enfileirada`);
  }

  const jitters = query(`
    SELECT agent_id::text, jitter_seconds::text
    FROM public.agent_healing_actions
    WHERE created_at > now() - interval '7 days'
    ORDER BY created_at DESC LIMIT 200
  `);
  for (const [agentId, jitter] of jitters) {
    const expected = jitterSecondsFor(agentId, POLICY);
    if (Number(jitter) !== expected && Number(jitter) !== 0) {
      errors.push(`jitter não reproduzível para o agente ${agentId}: ${jitter} ≠ ${expected}`);
      break;
    }
  }
}

for (const w of warnings) console.warn(`AVISO: ${w}`);

if (errors.length > 0) {
  console.error('\nGate do orçamento de reinícios FALHOU:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('✅ Controle de admissão de reinícios íntegro (política, jitter e disjuntor em paridade).');
