#!/usr/bin/env node
/**
 * Gate de CI — Onda 180: reincidência de alarme persistida.
 *
 * O módulo TypeScript (`src/lib/alarms/alarmRecurrence.ts`) decide como a
 * repetição chega ao operador; o banco é o espelho durável dessa decisão. Se
 * os dois divergirem, a UI mostra uma classificação e o servidor grava outra.
 * Este gate valida contrato, privilégios, paridade de constantes e — o que
 * gate estático nunca prova — **execução real** das rotinas em transação
 * revertida.
 *
 *  1. Tabela existe com RLS e sem qualquer privilégio para `anon`.
 *  2. Índice único de "um episódio aberto por série" presente.
 *  3. Rotinas são SECURITY DEFINER e não executáveis por anon/PUBLIC.
 *  4. Paridade dos limiares padrão entre SQL e TypeScript.
 *  5. Bateria funcional: abertura, reabertura ignorada, encerramento,
 *     imutabilidade, escada de classificação, oscilação, crítico nunca
 *     resumido e janela que esquece.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, cond, detail) => {
  if (!cond) failures.push(`${label}: ${detail}`);
};

const source = readFileSync(new URL('../src/lib/alarms/alarmRecurrence.ts', import.meta.url), 'utf8');
const TABLE = 'alarm_recurrence_episodes';
const FUNCS = ['record_alarm_episode_open', 'record_alarm_episode_close', 'assess_alarm_recurrence'];

// --- 1) Tabela, RLS e privilégios -------------------------------------------
check('TABELA', query(`SELECT to_regclass('public.${TABLE}') IS NOT NULL`) === 't', `${TABLE} ausente`);
check(
  'RLS',
  query(`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.${TABLE}'::regclass`) === 't',
  'RLS desabilitada',
);
const anonPriv = query(`
  SELECT COALESCE(string_agg(DISTINCT privilege_type, ','), '')
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = '${TABLE}' AND grantee = 'anon'`);
check('ANON', anonPriv === '', `anon possui privilégios (${anonPriv})`);

const authPriv = query(`
  SELECT COALESCE(string_agg(DISTINCT privilege_type, ','), '')
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = '${TABLE}' AND grantee = 'authenticated'`);
check('AUTH', authPriv === 'SELECT', `authenticated deveria ter só SELECT, tem (${authPriv})`);

// --- 2) Um episódio aberto por série -----------------------------------------
check(
  'ÍNDICE',
  query(`SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='${TABLE}'
           AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%closed_at IS NULL%'`) === '1',
  'índice único de episódio aberto ausente',
);
check(
  'GATILHO',
  query(`SELECT count(*) FROM pg_trigger WHERE tgrelid='public.${TABLE}'::regclass AND NOT tgisinternal`) !== '0',
  'gatilho de imutabilidade ausente',
);

// --- 3) Rotinas ---------------------------------------------------------------
for (const fn of FUNCS) {
  const secdef = query(`
    SELECT COALESCE(bool_and(p.prosecdef)::text, 'missing') FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='${fn}'`);
  check('ROTINA', secdef === 'true', `${fn} não é SECURITY DEFINER (${secdef})`);

  const execAnon = query(`
    SELECT COALESCE(string_agg(DISTINCT grantee::regrole::text, ','), '')
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
     WHERE n.nspname='public' AND p.proname='${fn}'
       AND a.grantee::regrole::text IN ('anon','-')`);
  check('EXECUTE', execAnon === '', `${fn} alcançável por (${execAnon})`);
}

// --- 4) Paridade de limiares --------------------------------------------------
const ts = {
  windowMs: Number(/windowMs:\s*([\d_]+)/.exec(source)?.[1]?.replace(/_/g, '')),
  recurrentThreshold: Number(/recurrentThreshold:\s*(\d+)/.exec(source)?.[1]),
  chronicThreshold: Number(/chronicThreshold:\s*(\d+)/.exec(source)?.[1]),
  chatterMaxMs: Number(/chatterMaxMs:\s*([\d_]+)/.exec(source)?.[1]?.replace(/_/g, '')),
  chatterThreshold: Number(/chatterThreshold:\s*(\d+)/.exec(source)?.[1]),
};
const sqlDefaults = query(`
  SELECT pg_get_function_arguments(p.oid) FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='assess_alarm_recurrence'`);
const sqlDefault = (name) => Number(new RegExp(`${name}[^=]*DEFAULT\\s+(\\d+)`).exec(sqlDefaults)?.[1]);
check('PARIDADE', sqlDefault('p_window_ms') === ts.windowMs, `janela SQL=${sqlDefault('p_window_ms')} TS=${ts.windowMs}`);
check(
  'PARIDADE',
  sqlDefault('p_recurrent_threshold') === ts.recurrentThreshold,
  `reincidente SQL=${sqlDefault('p_recurrent_threshold')} TS=${ts.recurrentThreshold}`,
);
check(
  'PARIDADE',
  sqlDefault('p_chronic_threshold') === ts.chronicThreshold,
  `crônico SQL=${sqlDefault('p_chronic_threshold')} TS=${ts.chronicThreshold}`,
);
check(
  'PARIDADE',
  sqlDefault('p_chatter_max_ms') === ts.chatterMaxMs,
  `chatter SQL=${sqlDefault('p_chatter_max_ms')} TS=${ts.chatterMaxMs}`,
);
check(
  'PARIDADE',
  sqlDefault('p_chatter_threshold') === ts.chatterThreshold,
  `limiar de oscilação SQL=${sqlDefault('p_chatter_threshold')} TS=${ts.chatterThreshold}`,
);

// --- 5) Bateria funcional em transação revertida -------------------------------
// Gate estático não prova execução: aqui as rotinas realmente rodam.
const ACTOR = '00000000-0000-0000-0000-00000000d180';
const functional = query(`
BEGIN;
  SET LOCAL client_min_messages = warning;
  INSERT INTO public.organizations (id, name) VALUES ('00000000-0000-0000-0000-0000000d1800', 'gate-180');
  INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES ('00000000-0000-0000-0000-0000000d1800', '${ACTOR}', 'owner');
  SELECT set_config('request.jwt.claims', json_build_object('sub', '${ACTOR}')::text, true);

  -- Isolada: um episódio longo.
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s1','medium',NULL, now() - interval '30 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s1', now() - interval '20 min');

  -- Reincidente não crítica: mais dois episódios longos.
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s1','low',NULL, now() - interval '15 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s1', now() - interval '10 min');
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s1','low',NULL, now() - interval '8 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s1', now() - interval '5 min');

  -- Série crítica com 3 episódios: nunca pode ser resumida.
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s2','critical',NULL, now() - interval '30 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s2', now() - interval '25 min');
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s2','low',NULL, now() - interval '20 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s2', now() - interval '15 min');
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s2','low',NULL, now() - interval '10 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s2', now() - interval '5 min');

  -- Oscilação: três episódios de 2s.
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s3','low',NULL, now() - interval '9 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s3', now() - interval '9 min' + interval '2 sec');
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s3','low',NULL, now() - interval '8 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s3', now() - interval '8 min' + interval '2 sec');
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s3','low',NULL, now() - interval '7 min');
  SELECT public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s3', now() - interval '7 min' + interval '2 sec');

  -- Episódio aberto: sem duração e sempre dentro da janela.
  SELECT public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s4','high',NULL, now() - interval '2 min');

  SELECT string_agg(x, '|') FROM (
    SELECT 's1=' || klass || ',' || mode || ',' || episodes_in_window AS x
      FROM public.assess_alarm_recurrence('00000000-0000-0000-0000-0000000d1800','s1')
    UNION ALL
    SELECT 's2=' || klass || ',' || mode || ',' || coalesce(peak_severity,'-')
      FROM public.assess_alarm_recurrence('00000000-0000-0000-0000-0000000d1800','s2')
    UNION ALL
    SELECT 's3=' || klass || ',' || flapping::text || ',' || chatter_in_window
      FROM public.assess_alarm_recurrence('00000000-0000-0000-0000-0000000d1800','s3')
    UNION ALL
    SELECT 's4=' || is_open::text || ',' || episodes_in_window
      FROM public.assess_alarm_recurrence('00000000-0000-0000-0000-0000000d1800','s4')
    UNION ALL
    -- Janela antiga esquece, mas as linhas continuam lá (acumulado é prova).
    SELECT 'old=' || episodes_in_window || ',' || (
      SELECT count(*) FROM public.alarm_recurrence_episodes
       WHERE series_key = 's1')
      FROM public.assess_alarm_recurrence('00000000-0000-0000-0000-0000000d1800','s1', now(), 60000)
    UNION ALL
    -- Reabertura sem fechar devolve o episódio vigente (não cria fantasma).
    SELECT 'reopen=' || (
      public.record_alarm_episode_open('00000000-0000-0000-0000-0000000d1800','s4','high',NULL, now())
      = (SELECT id FROM public.alarm_recurrence_episodes
          WHERE series_key='s4' AND closed_at IS NULL))::text
    UNION ALL
    -- Aberto nunca tem duração.
    SELECT 'nodur=' || (SELECT count(*) FROM public.alarm_recurrence_episodes
                         WHERE closed_at IS NULL AND duration_ms IS NOT NULL)::text
    UNION ALL
    -- Fechar sem aberto devolve NULL.
    SELECT 'noopen=' || (public.record_alarm_episode_close('00000000-0000-0000-0000-0000000d1800','s9', now()) IS NULL)::text
  ) t;
ROLLBACK;
`);

const parts = Object.fromEntries(
  functional
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split('=')),
);
check('FUNCIONAL', parts.s1 === 'recurrent,summarize,3', `s1 esperado recurrent,summarize,3 obtido ${parts.s1}`);
check('FUNCIONAL', parts.s2 === 'recurrent,notify,critical', `s2 crítico foi resumido: ${parts.s2}`);
check('FUNCIONAL', parts.s3 === 'recurrent,true,3', `s3 oscilação não detectada: ${parts.s3}`);
check('FUNCIONAL', parts.s4 === 'true,1', `s4 episódio aberto: ${parts.s4}`);
check('FUNCIONAL', parts.old === '0,3', `janela curta deveria esquecer sem apagar: ${parts.old}`);
check('FUNCIONAL', parts.reopen === 'true', 'reabertura criou episódio fantasma');
check('FUNCIONAL', parts.nodur === '0', 'episódio aberto com duração gravada');
check('FUNCIONAL', parts.noopen === 'true', 'fechar sem aberto não devolveu NULL');

// Imutabilidade: DELETE e reescrita precisam falhar.
const immutability = (sql) => {
  try {
    execFileSync('psql', ['-tA', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8', stdio: 'pipe' });
    return 'ok';
  } catch (e) {
    return String(e.stderr ?? e.message);
  }
};
const prelude = `
BEGIN;
  SET LOCAL client_min_messages = warning;
  INSERT INTO public.organizations (id, name) VALUES ('00000000-0000-0000-0000-0000000d1801', 'gate-180b');
  INSERT INTO public.alarm_recurrence_episodes (id, organization_id, series_key, severity, opened_at, closed_at, duration_ms)
    VALUES ('00000000-0000-0000-0000-0000000d1802','00000000-0000-0000-0000-0000000d1801','s','low', now() - interval '1 min', now(), 60000);
`;
check(
  'IMUTÁVEL',
  immutability(`${prelude} DELETE FROM public.alarm_recurrence_episodes WHERE id='00000000-0000-0000-0000-0000000d1802'; ROLLBACK;`) !== 'ok',
  'DELETE foi aceito no histórico de reincidência',
);
check(
  'IMUTÁVEL',
  immutability(
    `${prelude} UPDATE public.alarm_recurrence_episodes SET severity='critical' WHERE id='00000000-0000-0000-0000-0000000d1802'; ROLLBACK;`,
  ) !== 'ok',
  'reescrita de episódio encerrado foi aceita',
);

if (failures.length > 0) {
  console.error('❌ Gate alarm-recurrence falhou:');
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('✅ Gate alarm-recurrence: contrato, privilégios, paridade e execução real OK.');
