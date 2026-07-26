#!/usr/bin/env node
/**
 * Gate de CI — Onda 121: locação de execução (lease) e reentrega da fila.
 *
 * Verifica no banco real:
 *  1. Colunas e CHECK de tentativas presentes.
 *  2. Paridade literal entre `public.relay_lease_policy()` e src/lib/relayLease.ts.
 *  3. `claim_agent_relay_tasks` concede lease, incrementa tentativas e respeita o teto.
 *  4. `reap_agent_relay_leases` reentrega com recuo, respeita prazo final e grava
 *     os dois motivos terminais.
 *  5. `expire_agent_relay_tasks` chama o reaper (senão o lease nunca vence).
 *  6. Índice do reaper presente.
 *  7. `check_relay_reliability_and_alert` não usa o status inexistente 'completed'.
 *  8. Nenhum dado vivo com lease impossível (tentativas acima do teto).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const notes = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

// --- Política declarada no TypeScript ---------------------------------------
const lib = readFileSync(new URL('../src/lib/relayLease.ts', import.meta.url), 'utf8');
const tsConst = (name) => {
  const m = lib.match(new RegExp(`${name}:\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
};
const policy = {
  lease_seconds: tsConst('leaseSeconds'),
  max_attempts: tsConst('maxAttempts'),
  backoff_base_seconds: tsConst('backoffBaseSeconds'),
  backoff_max_seconds: tsConst('backoffMaxSeconds'),
  hard_deadline_seconds: null, // herdado de relayTaskWindow.maxWindowSeconds
};
const windowLib = readFileSync(new URL('../src/lib/relayTaskWindow.ts', import.meta.url), 'utf8');
const minWindow = Number(windowLib.match(/minWindowSeconds:\s*(\d+)/)?.[1]);
policy.hard_deadline_seconds = Number(windowLib.match(/maxWindowSeconds:\s*(\d+)/)?.[1]);

check(
  'POLÍTICA',
  Object.values(policy).every((v) => Number.isFinite(v)) && Number.isFinite(minWindow),
  'não consegui ler as constantes de relayLease.ts / relayTaskWindow.ts',
);

// --- 1) Colunas e CHECK ------------------------------------------------------
const cols = query(`
  SELECT string_agg(column_name, ',' ORDER BY column_name)
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='agent_relay_tasks'
     AND column_name IN ('attempts','lease_expires_at','last_error')`);
check('SCHEMA', cols === 'attempts,last_error,lease_expires_at', `colunas de lease ausentes (${cols})`);

const attemptsChk = query(
  `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='agent_relay_tasks_attempts_sane'`,
);
check('SCHEMA', /attempts >= 0/.test(attemptsChk), 'CHECK de sanidade de tentativas ausente');

// --- 2) Paridade da política -------------------------------------------------
const dbPolicy = query(`
  SELECT lease_seconds||'|'||max_attempts||'|'||backoff_base_seconds||'|'||backoff_max_seconds
         ||'|'||min_window_seconds||'|'||hard_deadline_seconds
    FROM public.relay_lease_policy()`);
const [dbLease, dbMax, dbBase, dbCap, dbMinWin, dbDeadline] = dbPolicy.split('|').map(Number);
check('PARIDADE', dbLease === policy.lease_seconds, `lease ${dbLease}s no SQL vs ${policy.lease_seconds}s no TS`);
check('PARIDADE', dbMax === policy.max_attempts, `maxAttempts ${dbMax} no SQL vs ${policy.max_attempts} no TS`);
check('PARIDADE', dbBase === policy.backoff_base_seconds, 'base do recuo divergente entre SQL e TS');
check('PARIDADE', dbCap === policy.backoff_max_seconds, 'teto do recuo divergente entre SQL e TS');
check('PARIDADE', dbMinWin === minWindow, 'janela mínima divergente da política da Onda 119');
check('PARIDADE', dbDeadline === policy.hard_deadline_seconds, 'prazo final divergente entre SQL e TS');

// --- 3) claim ----------------------------------------------------------------
const claimDef = query(`
  SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='claim_agent_relay_tasks'`);
check('CLAIM', /lease_expires_at\s*=\s*now\(\)\s*\+/.test(claimDef), 'claim não concede lease com prazo');
check('CLAIM', /attempts\s*=\s*t\.attempts\s*\+\s*1/.test(claimDef), 'claim não incrementa tentativas');
check('CLAIM', /attempts\s*<\s*pol\.max_attempts/.test(claimDef), 'claim não respeita o teto de tentativas');
check('CLAIM', /FOR UPDATE SKIP LOCKED/.test(claimDef), 'claim sem SKIP LOCKED — risco de execução dupla');

// --- 4) reaper ---------------------------------------------------------------
const reapDef = query(`
  SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='reap_agent_relay_leases'`);
check('REAPER', reapDef.length > 0, 'reap_agent_relay_leases não existe');
check('REAPER', /lease_expires_at IS NULL OR t\.lease_expires_at <= now\(\)/.test(reapDef),
  'reaper não seleciona apenas leases vencidos — risco de reentregar tarefa em execução');
check('REAPER', /backoff_max_seconds/.test(reapDef) && /power\(2/.test(reapDef),
  'reaper sem recuo exponencial limitado');
check('REAPER', /hard_deadline_seconds/.test(reapDef), 'reaper não respeita o prazo final absoluto');
check('REAPER', reapDef.includes('task_expired_attempts_exhausted'), 'motivo de teto de tentativas ausente');
check('REAPER', reapDef.includes('task_expired_deadline'), 'motivo de prazo final ausente');
check('REAPER', /min_window_seconds/.test(reapDef), 'reentrega sem janela mínima justa (Onda 119)');

// --- 5) encadeamento ---------------------------------------------------------
const expireDef = query(`
  SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='expire_agent_relay_tasks'`);
check('ENCADEAMENTO', expireDef.includes('reap_agent_relay_leases'),
  'expire_agent_relay_tasks não aciona o reaper — leases nunca venceriam');
check('ENCADEAMENTO', !/status IN \('pending','in_progress'\)/.test(expireDef),
  'expire_agent_relay_tasks ainda expira in_progress direto, ignorando o lease');

// --- 6) Índice ---------------------------------------------------------------
const idx = query(`SELECT indexdef FROM pg_indexes WHERE indexname='idx_agent_relay_tasks_lease'`);
check('ÍNDICE', idx.includes('lease_expires_at'), 'índice do reaper ausente');

// --- 7) Status de sucesso correto -------------------------------------------
const relDef = query(`
  SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='check_relay_reliability_and_alert'`);
check('CONFIABILIDADE', !relDef.includes("'completed'"),
  "alerta de agente degradado compara com o status inexistente 'completed' — alarme falso garantido");
check('CONFIABILIDADE', relDef.includes('task_expired_deadline'),
  'alerta de degradação conta encerramentos administrativos contra o agente');

// --- 8) Dados vivos ----------------------------------------------------------
const bad = query(`
  SELECT count(*) FILTER (WHERE attempts > ${dbMax}) || '|' ||
         count(*) FILTER (WHERE status='in_progress' AND lease_expires_at IS NULL)
    FROM public.agent_relay_tasks`);
const [overAttempts, leaseless] = bad.split('|').map(Number);
check('DADOS', overAttempts === 0, `${overAttempts} tarefa(s) acima do teto de tentativas`);
if (leaseless > 0) {
  notes.push(`AVISO: ${leaseless} tarefa(s) em execução sem lease (linhas anteriores à Onda 121) — o reaper as recupera.`);
}

for (const n of notes) console.log(n);

if (failures.length > 0) {
  console.error('❌ Locação/reentrega da fila de relay comprometida:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('✅ Lease e reentrega íntegros (paridade, recuo, prazo final e diagnóstico justo).');
