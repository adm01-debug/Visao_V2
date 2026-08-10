#!/usr/bin/env node
/**
 * Gate de CI — Onda 184: retenção auditada dos episódios de reincidência.
 *
 * O que é verificado no banco real:
 *  1. Contrato: rotina, política e tabela de auditoria existem com a forma
 *     esperada; a auditoria é append-only por gatilho.
 *  2. Exposição: `anon` não enxerga nem executa nada; `authenticated` só lê a
 *     auditoria (e apenas administradores, via RLS); a rotina é de serviço.
 *  3. Paridade literal SQL ↔ TypeScript da política.
 *  4. Coerência de prazos: o prazo de guarda precisa ser folgadamente maior
 *     que a janela de avaliação de reincidência — senão o expurgo mudaria o
 *     veredito do painel de séries crônicas.
 *  5. Bateria funcional em BEGIN ... ROLLBACK — gate estático não prova
 *     execução:
 *       a) episódio fechado fora do prazo é apagado;
 *       b) episódio fechado dentro do prazo sobrevive;
 *       c) episódio ABERTO antigo nunca é apagado, só contado;
 *       d) o prazo conta pelo fechamento, não pela abertura;
 *       e) DELETE direto continua recusado (append-only intacto);
 *       f) a execução é registrada na auditoria com resto declarado.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const queryTx = (sql) =>
  query(sql)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== 'BEGIN' && line !== 'ROLLBACK')
    .join('\n');
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/retention/alarmRecurrenceRetention.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');
const RECURRENCE = readFileSync(
  new URL('../src/lib/alarms/alarmRecurrence.ts', import.meta.url),
  'utf8'
);

// --- 1) Contrato ---------------------------------------------------------------
const routines = query(`
  SELECT COALESCE(string_agg(p.proname||':'||p.prosecdef, ',' ORDER BY p.proname), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('purge_alarm_recurrence_episodes','alarm_recurrence_retention_policy')`);
check(
  'CONTRATO',
  routines.includes('purge_alarm_recurrence_episodes:t'),
  `rotina ausente ou não SECURITY DEFINER: ${routines}`
);
check(
  'CONTRATO',
  routines.includes('alarm_recurrence_retention_policy:f'),
  `política ausente ou indevidamente DEFINER: ${routines}`
);

const searchPaths = query(`
  SELECT COALESCE(string_agg(p.proname, ',' ORDER BY p.proname), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('purge_alarm_recurrence_episodes','alarm_recurrence_retention_policy','block_retention_run_mutation')
     AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')`);
check('CONTRATO', searchPaths === '', `rotinas sem search_path fixo: ${searchPaths}`);

const auditTrigger = query(`
  SELECT count(*) FROM pg_trigger
   WHERE tgrelid = 'public.alarm_recurrence_purge_runs'::regclass AND NOT tgisinternal`);
check(
  'CONTRATO',
  auditTrigger === '1',
  `auditoria sem gatilho de imutabilidade (encontrados: ${auditTrigger})`
);

// --- 2) Exposição --------------------------------------------------------------
const anonExec = query(`
  SELECT COALESCE(string_agg(DISTINCT p.proname||':'||a.grantee::regrole::text, ',' ), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
   WHERE n.nspname = 'public'
     AND p.proname = 'purge_alarm_recurrence_episodes'
     AND a.privilege_type = 'EXECUTE'
     AND a.grantee::regrole::text IN ('anon','authenticated','public','-')`);
check(
  'EXPOSIÇÃO',
  anonExec === '',
  `rotina de expurgo executável por quem não deveria: ${anonExec}`
);

// `information_schema` só mostra concessões visíveis ao papel atual — aqui a
// leitura é feita direto no ACL, que é a verdade.
const anonTable = query(`
  SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text||':'||a.privilege_type, ','), '')
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(c.relacl) a
   WHERE c.oid = 'public.alarm_recurrence_purge_runs'::regclass
     AND a.grantee::regrole::text IN ('anon','-')`);
check('EXPOSIÇÃO', anonTable === '', `anon tem acesso à trilha de expurgo: ${anonTable}`);

const authTable = query(`
  SELECT COALESCE(string_agg(DISTINCT a.privilege_type, ',' ORDER BY a.privilege_type), '')
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(c.relacl) a
   WHERE c.oid = 'public.alarm_recurrence_purge_runs'::regclass
     AND a.grantee::regrole::text = 'authenticated'`);
check(
  'EXPOSIÇÃO',
  authTable === 'SELECT',
  `authenticated deveria ter apenas SELECT, tem: ${authTable}`
);

const rlsOn = query(
  `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.alarm_recurrence_purge_runs'::regclass`
);
check('EXPOSIÇÃO', rlsOn === 't', 'RLS desabilitada na trilha de expurgo');

const policyQual = query(`
  SELECT COALESCE(string_agg(pg_get_expr(polqual, polrelid), '|'), '')
    FROM pg_policy WHERE polrelid = 'public.alarm_recurrence_purge_runs'::regclass`);
check(
  'EXPOSIÇÃO',
  policyQual.includes("'admin'"),
  `leitura da trilha não é restrita a administrador: ${policyQual}`
);

// --- 3) Paridade SQL <-> TypeScript --------------------------------------------
const sqlPolicy = query(`
  SELECT (p ->> 'closedRetentionDays')||'|'||(p ->> 'abandonedOpenDays')||'|'||(p ->> 'maxDeletePerRun')
    FROM public.alarm_recurrence_retention_policy() p`);
const tsPolicy = [
  /CLOSED_RETENTION_DAYS\s*=\s*(\d+)/.exec(source)?.[1],
  /ABANDONED_OPEN_DAYS\s*=\s*(\d+)/.exec(source)?.[1],
  /MAX_DELETE_PER_RUN\s*=\s*(\d+)/.exec(source)?.[1],
].join('|');
check(
  'PARIDADE',
  sqlPolicy === tsPolicy,
  `política divergente SQL='${sqlPolicy}' TS='${tsPolicy}'`
);

const registryEntry = query(`
  SELECT COALESCE(string_agg(job_name||'|'||source_table||'|'||cadence_minutes, ','), '')
    FROM public.retention_routine_registry() WHERE source_table = 'alarm_recurrence_purge_runs'`);
check(
  'REGISTRO',
  registryEntry === 'alarm_recurrence|alarm_recurrence_purge_runs|1440',
  `rotina não registrada na supervisão de retenção: '${registryEntry}'`
);

// --- 4) Coerência de prazos -----------------------------------------------------
// O expurgo não pode alcançar dado que a janela de reincidência ainda consulta:
// se alcançasse, apagar linha antiga MUDARIA o veredito do painel de séries.
const windowMs = Number(/windowMs:\s*([\d_]+)/.exec(RECURRENCE)?.[1].replace(/_/g, ''));
const retentionMs = Number(tsPolicy.split('|')[0]) * 86_400_000;
check(
  'COERÊNCIA',
  Number.isFinite(windowMs) && windowMs > 0 && retentionMs > windowMs * 100,
  `prazo de guarda (${retentionMs}ms) próximo demais da janela de reincidência (${windowMs}ms) — expurgo alteraria o veredito`
);

// --- 5) Bateria funcional em transação revertida -------------------------------
const ACTOR = '00000000-0000-0000-0000-00000000d184';
const ORG = '00000000-0000-0000-0000-0000000d1840';

const battery = queryTx(`
BEGIN;
  SET LOCAL client_min_messages = warning;
  INSERT INTO public.organizations (id, name, slug, created_by)
    VALUES ('${ORG}', 'gate-184', 'gate-184', '${ACTOR}');

  INSERT INTO public.alarm_recurrence_episodes (organization_id, series_key, severity, opened_at, closed_at, duration_ms)
  VALUES
    ('${ORG}', 'expira', 'high', now() - interval '400 days', now() - interval '399 days', 86400000),
    ('${ORG}', 'guarda', 'low',  now() - interval '2 days',   now() - interval '1 day',    86400000),
    ('${ORG}', 'longo',  'high', now() - interval '400 days', now() - interval '1 day',    1);
  INSERT INTO public.alarm_recurrence_episodes (organization_id, series_key, severity, opened_at)
  VALUES ('${ORG}', 'aberto', 'critical', now() - interval '900 days');

  SELECT 'apagados=' || (public.purge_alarm_recurrence_episodes() ->> 'deletedEpisodes');
  SELECT 'sobrou=' || COALESCE(string_agg(series_key, ',' ORDER BY series_key), '(nada)')
    FROM public.alarm_recurrence_episodes WHERE organization_id = '${ORG}';
  SELECT 'abandonados=' || abandoned_open || ';pendentes=' || pending_episodes || ';truncado=' || truncated
    FROM public.alarm_recurrence_purge_runs ORDER BY executed_at DESC LIMIT 1;
ROLLBACK;
`);

const line = (prefix) => battery.split('\n').find((l) => l.startsWith(prefix)) ?? '(ausente)';
check(
  'FUNCIONAL',
  line('apagados=') === 'apagados=1',
  `apenas o episódio fora do prazo deveria sair: ${line('apagados=')}`
);
check(
  'FUNCIONAL',
  line('sobrou=') === 'sobrou=aberto,guarda,longo',
  `sobreviventes errados — aberto e recentes devem permanecer: ${line('sobrou=')}`
);
check(
  'FUNCIONAL',
  line('abandonados=') === 'abandonados=1;pendentes=0;truncado=false',
  `auditoria não refletiu a execução corretamente: ${line('abandonados=')}`
);

// (e) DELETE direto continua recusado, mesmo para o dono do banco.
const directDelete = queryTx(`
BEGIN;
  SET LOCAL client_min_messages = error;
  INSERT INTO public.organizations (id, name, slug, created_by)
    VALUES ('${ORG}', 'gate-184b', 'gate-184b', '${ACTOR}');
  INSERT INTO public.alarm_recurrence_episodes (organization_id, series_key, severity, opened_at, closed_at, duration_ms)
    VALUES ('${ORG}', 'imutavel', 'low', now() - interval '400 days', now() - interval '399 days', 1);
  SAVEPOINT s;
  DO $$
  BEGIN
    DELETE FROM public.alarm_recurrence_episodes WHERE series_key = 'imutavel';
    RAISE NOTICE 'ACEITOU';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RECUSOU';
  END $$;
  SELECT 'restou=' || count(*) FROM public.alarm_recurrence_episodes WHERE series_key = 'imutavel';
ROLLBACK;
`);
check(
  'IMUTABILIDADE',
  directDelete.includes('restou=1'),
  `DELETE direto passou pelo gatilho: ${directDelete}`
);

// A variável de sessão não pode ficar "grudada" após a rotina — senão qualquer
// DELETE posterior na mesma transação herdaria a licença do expurgo.
const leak = queryTx(`
BEGIN;
  SET LOCAL client_min_messages = error;
  SELECT public.purge_alarm_recurrence_episodes();
  SELECT 'flag=[' || COALESCE(current_setting('app.retention_purge', true), '') || ']';
ROLLBACK;
`);
check(
  'IMUTABILIDADE',
  leak.includes('flag=[]'),
  `licença de expurgo vazou para o resto da transação: ${leak}`
);

// --- Veredito -------------------------------------------------------------------
if (failures.length > 0) {
  console.error('❌ Gate de retenção da reincidência (Onda 184) reprovado:');
  for (const failure of failures) console.error(`   • ${failure}`);
  process.exit(1);
}
console.log('✅ Gate de retenção da reincidência (Onda 184) aprovado.');
