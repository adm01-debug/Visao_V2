#!/usr/bin/env node
/**
 * Gate de CI — Onda 119: integridade temporal da fila de relay.
 *
 * Verifica no banco real:
 *  1. Trigger de normalização existe, está habilitado e cobre INSERT e UPDATE.
 *  2. CHECK de janela positiva existe.
 *  3. Paridade das constantes entre PL/pgSQL e src/lib/relayTaskWindow.ts.
 *  4. `expire_agent_relay_tasks` classifica os três motivos de expiração.
 *  5. `heal_local_agents` só conta expiração com janela justa como surdez.
 *  6. Índice de elegibilidade presente (o polling roda de segundos em segundos).
 *  7. Nenhuma tarefa viva com janela inválida ou injusta.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const notes = [];

function query(sql) {
  return execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
}

function check(label, condition, detail) {
  if (!condition) failures.push(`${label}: ${detail}`);
}

// --- Política declarada no TypeScript (fonte única de verdade) --------------
const libSource = readFileSync(new URL('../src/lib/relayTaskWindow.ts', import.meta.url), 'utf8');
function tsConstant(name) {
  const m = libSource.match(new RegExp(`${name}:\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
}
const minWindow = tsConstant('minWindowSeconds');
const fairWindow = tsConstant('fairWindowSeconds');
const maxWindow = tsConstant('maxWindowSeconds');

check(
  'POLÍTICA',
  minWindow !== null && fairWindow !== null && maxWindow !== null,
  'não consegui ler as constantes de relayTaskWindow.ts'
);

// --- 1) Trigger --------------------------------------------------------------
const trg = query(`
  SELECT tgenabled::text || '|' || tgtype::int
    FROM pg_trigger
   WHERE tgname = 'trg_normalize_agent_relay_task_window'
     AND tgrelid = 'public.agent_relay_tasks'::regclass`);
check('TRIGGER', trg.startsWith('O'), 'trigger de normalização ausente ou desabilitado');
if (trg) {
  const tgtype = Number(trg.split('|')[1]);
  check('TRIGGER', (tgtype & 4) !== 0, 'trigger não cobre INSERT');
  check('TRIGGER', (tgtype & 16) !== 0, 'trigger não cobre UPDATE');
  check(
    'TRIGGER',
    (tgtype & 2) !== 0,
    'trigger não é BEFORE — normalizar depois da CHECK é inútil'
  );
}

// --- 2) CHECK ----------------------------------------------------------------
const chk = query(`
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conname = 'agent_relay_tasks_delivery_window_positive'`);
check('CHECK', /expires_at\s*>\s*scheduled_at/.test(chk), 'CHECK de janela positiva ausente');

// --- 3) Paridade das constantes ---------------------------------------------
const normDef = query(`
  SELECT replace(pg_get_functiondef(p.oid), E'\\n', ' ')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'normalize_agent_relay_task_window'`);
check(
  'PARIDADE',
  normDef.includes(`'${minWindow} seconds'`),
  `janela mínima do SQL não bate com minWindowSeconds=${minWindow}`
);
check(
  'PARIDADE',
  normDef.includes(`'${maxWindow} seconds'`),
  `teto do SQL não bate com maxWindowSeconds=${maxWindow}`
);
check('PARIDADE', /SET search_path/i.test(normDef), 'normalizador sem search_path fixo');

// --- 4) Classificação da expiração ------------------------------------------
// Onda 121: o encerramento passou a ser dividido entre `expire_agent_relay_tasks`
// (tarefas nunca reivindicadas) e `reap_agent_relay_leases` (leases vencidos).
// A cobertura dos motivos é avaliada sobre a união das duas rotinas.
const expDef = query(`
  SELECT replace(string_agg(pg_get_functiondef(p.oid), ' '), E'\\n', ' ')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('expire_agent_relay_tasks', 'reap_agent_relay_leases')`);
for (const reason of [
  'task_expired_unfair_window',
  'task_expired_unclaimed',
  'task_expired_attempts_exhausted',
]) {
  check('EXPIRAÇÃO', expDef.includes(reason), `motivo ${reason} não é emitido`);
}
check(
  'EXPIRAÇÃO',
  /SECURITY DEFINER/i.test(expDef) && /SET search_path/i.test(expDef),
  'expire_agent_relay_tasks sem blindagem'
);

// --- 5) Justiça do diagnóstico ----------------------------------------------
const healDef = query(`
  SELECT replace(pg_get_functiondef(p.oid), E'\\n', ' ')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'heal_local_agents'`);
check(
  'DIAGNÓSTICO',
  healDef.includes(`>= interval '${fairWindow} seconds'`),
  `heal_local_agents não filtra janela justa de ${fairWindow}s — expiração indevida viraria reinício`
);
check(
  'DIAGNÓSTICO',
  healDef.includes('task_expired_unfair_window'),
  'heal_local_agents não exclui expirações de janela injusta'
);

// --- 6) Índice ---------------------------------------------------------------
const idx = query(
  `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_agent_relay_tasks_claimable'`
);
check(
  'ÍNDICE',
  idx.includes('agent_id') && idx.includes('scheduled_at'),
  'índice de elegibilidade ausente ou sem as colunas do filtro de claim'
);

// --- 7) Dados vivos ----------------------------------------------------------
const bad = query(`
  SELECT count(*) FILTER (WHERE expires_at <= scheduled_at) || '|' ||
         count(*) FILTER (WHERE status = 'pending'
                            AND (expires_at - scheduled_at) < interval '${fairWindow} seconds')
    FROM public.agent_relay_tasks`);
const [invalid, unfair] = bad.split('|').map(Number);
check('DADOS', invalid === 0, `${invalid} tarefa(s) com janela invertida`);
check('DADOS', unfair === 0, `${unfair} tarefa(s) pendentes com janela injusta`);

const unfairExpired = Number(
  query(`SELECT count(*) FROM public.agent_relay_tasks WHERE error = 'task_expired_unfair_window'`)
);
if (unfairExpired > 0) {
  notes.push(
    `AVISO: ${unfairExpired} tarefa(s) expiraram por janela injusta — indica produtor gravando TTL fora da política.`
  );
}

for (const n of notes) console.log(n);

if (failures.length > 0) {
  console.error('❌ Integridade temporal da fila de relay comprometida:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('✅ Janela de entrega íntegra (normalização, CHECK, paridade e diagnóstico justo).');
