#!/usr/bin/env node
/**
 * Gate de CI — Onda 183: painel de séries crônicas.
 *
 * O painel de manutenção não classifica nada por conta própria: ele lê as
 * contagens agregadas de `list_alarm_recurrence_series` e aplica a mesma
 * escada de `classifyRecurrenceCounts`. Este gate prova que:
 *
 *  1. A rotina existe, é STABLE + SECURITY DEFINER e não é alcançável por
 *     `anon`/PUBLIC (a tabela é sensível: revela o padrão de falha do site).
 *  2. Os padrões de janela e de oscilação são os mesmos do TypeScript — se
 *     divergirem, a tela mostra "crônico" onde o servidor contou "isolado".
 *  3. Execução real, em transação revertida: semântica de janela, oscilação,
 *     pior gravidade, episódio em curso, acumulado histórico, isolamento
 *     entre organizações e recusa a quem não é membro.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, cond, detail) => {
  if (!cond) failures.push(`${label}: ${detail}`);
};

const FN = 'list_alarm_recurrence_series';
const recurrenceSrc = readFileSync(
  new URL('../src/lib/alarms/alarmRecurrence.ts', import.meta.url),
  'utf8',
);
const boardSrc = readFileSync(
  new URL('../src/lib/alarms/chronicSeriesBoard.ts', import.meta.url),
  'utf8',
);

// --- 1) Contrato e privilégios ------------------------------------------------
const meta = query(`
  SELECT p.prosecdef::text || ',' || p.provolatile
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='${FN}'`);
check('ROTINA', meta === 'true,s', `${FN} deveria ser STABLE SECURITY DEFINER, é (${meta || 'ausente'})`);

const execAnon = query(`
  SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
   WHERE n.nspname='public' AND p.proname='${FN}'
     AND a.grantee::regrole::text IN ('anon','-')`);
check('EXECUTE', execAnon === '', `${FN} alcançável por (${execAnon})`);

const searchPath = query(`
  SELECT COALESCE(array_to_string(p.proconfig, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='${FN}'`);
check('SEARCH_PATH', /search_path=/.test(searchPath), `${FN} sem search_path fixo (${searchPath})`);

// --- 2) Paridade de constantes ------------------------------------------------
const args = query(`
  SELECT pg_get_function_arguments(p.oid) FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='${FN}'`);
const sqlDefault = (name) => Number(new RegExp(`${name}\\s+\\w+\\s+DEFAULT\\s+(\\d+)`).exec(args)?.[1]);
const tsWindow = Number(/windowMs:\s*([\d_]+)/.exec(recurrenceSrc)?.[1]?.replace(/_/g, ''));
const tsChatter = Number(/chatterMaxMs:\s*([\d_]+)/.exec(recurrenceSrc)?.[1]?.replace(/_/g, ''));
check('PARIDADE', sqlDefault('p_window_ms') === tsWindow, `janela SQL=${sqlDefault('p_window_ms')} TS=${tsWindow}`);
check(
  'PARIDADE',
  sqlDefault('p_chatter_max_ms') === tsChatter,
  `oscilação SQL=${sqlDefault('p_chatter_max_ms')} TS=${tsChatter}`,
);

// --- 3) Regra única -----------------------------------------------------------
check(
  'REGRA-ÚNICA',
  /classifyRecurrenceCounts/.test(boardSrc),
  'o painel reimplementou a classificação em vez de reusar a escada oficial',
);
check(
  'REGRA-ÚNICA',
  !/klass\s*=\s*'chronic'/.test(boardSrc),
  'o painel decide classe localmente — divergirá do servidor no primeiro ajuste',
);

// --- 4) Execução real em transação revertida ----------------------------------
const ORG = '00000000-0000-0000-0000-0000000d1830';
const OTHER = '00000000-0000-0000-0000-0000000d1831';
const ACTOR = '00000000-0000-0000-0000-00000000d183';
const STRANGER = '00000000-0000-0000-0000-00000000d184';
const open = (org, key, sev, ago) =>
  `SELECT public.record_alarm_episode_open('${org}','${key}','${sev}',NULL, now() - interval '${ago}');`;
const close = (org, key, expr) =>
  `SELECT public.record_alarm_episode_close('${org}','${key}', ${expr});`;

const functional = query(`
BEGIN;
  SET LOCAL client_min_messages = warning;
  INSERT INTO public.organizations (id, name, slug, created_by)
    VALUES ('${ORG}', 'gate-183', 'gate-183', '${ACTOR}'),
           ('${OTHER}', 'gate-183b', 'gate-183b', '${STRANGER}');
  INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES ('${ORG}', '${ACTOR}', 'owner'), ('${OTHER}', '${STRANGER}', 'owner')
    ON CONFLICT DO NOTHING;
  SELECT set_config('request.jwt.claims', json_build_object('sub', '${ACTOR}')::text, true);

  -- crônica: 6 episódios longos na janela
  ${[
    ['50 min', '45 min'],
    ['40 min', '35 min'],
    ['30 min', '25 min'],
    ['20 min', '15 min'],
    ['12 min', '10 min'],
    ['8 min', '6 min'],
  ]
    .map(([a, b]) => `${open(ORG, 'chr', 'medium', a)} ${close(ORG, 'chr', `now() - interval '${b}'`)}`)
    .join('\n  ')}

  -- oscilante: 3 episódios de 2s
  ${['9 min', '8 min', '7 min']
    .map((a) => `${open(ORG, 'osc', 'low', a)} ${close(ORG, 'osc', `now() - interval '${a}' + interval '2 sec'`)}`)
    .join('\n  ')}

  -- crítica em curso
  ${open(ORG, 'crit', 'critical', '3 min')}

  -- antiga: fora da janela de 1h, mas o acumulado permanece
  ${open(ORG, 'old', 'high', '5 hours')} ${close(ORG, 'old', `now() - interval '4 hours'`)}

  -- série de outra organização: nunca pode vazar
  ${open(OTHER, 'leak', 'critical', '2 min')}

  SELECT string_agg(x, '|') FROM (
    SELECT 'chr=' || episodes_in_window || ',' || chatter_in_window || ',' || total_episodes
           || ',' || is_open::text
      FROM public.${FN}('${ORG}') WHERE series_key = 'chr'
    UNION ALL
    SELECT 'osc=' || episodes_in_window || ',' || chatter_in_window
      FROM public.${FN}('${ORG}') WHERE series_key = 'osc'
    UNION ALL
    SELECT 'crit=' || is_open::text || ',' || coalesce(peak_severity,'-') || ','
           || (last_closed_at IS NULL)::text
      FROM public.${FN}('${ORG}') WHERE series_key = 'crit'
    UNION ALL
    -- fora da janela: some da lista, mas a linha continua no livro
    SELECT 'old=' || (SELECT count(*) FROM public.${FN}('${ORG}') WHERE series_key='old')::text
           || ',' || (SELECT count(*) FROM public.alarm_recurrence_episodes WHERE series_key='old')::text
    UNION ALL
    SELECT 'leak=' || (SELECT count(*) FROM public.${FN}('${ORG}') WHERE series_key='leak')::text
    UNION ALL
    SELECT 'total=' || (SELECT count(*) FROM public.${FN}('${ORG}'))::text
    UNION ALL
    -- janela ampla traz a antiga de volta
    SELECT 'wide=' || (SELECT count(*) FROM public.${FN}('${ORG}', now(), 86400000) WHERE series_key='old')::text
    UNION ALL
    -- teto respeitado
    SELECT 'limit=' || (SELECT count(*) FROM public.${FN}('${ORG}', now(), 3600000, 30000, 1))::text
  ) t;
ROLLBACK;
`);

const parts = Object.fromEntries(
  functional
    .split(/[|\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split('=')),
);
check('FUNCIONAL', parts.chr === '6,0,6,false', `crônica esperada 6,0,6,false obtida ${parts.chr}`);
check('FUNCIONAL', parts.osc === '3,3', `oscilação esperada 3,3 obtida ${parts.osc}`);
check('FUNCIONAL', parts.crit === 'true,critical,true', `crítica em curso: ${parts.crit}`);
check('FUNCIONAL', parts.old === '0,1', `janela deveria esquecer sem apagar: ${parts.old}`);
check('FUNCIONAL', parts.leak === '0', 'série de outra organização vazou para o painel');
check('FUNCIONAL', parts.total === '3', `séries visíveis esperadas 3, obtidas ${parts.total}`);
check('FUNCIONAL', parts.wide === '1', `janela ampla não recuperou a série antiga: ${parts.wide}`);
check('FUNCIONAL', parts.limit === '1', `teto de linhas ignorado: ${parts.limit}`);

// --- 5) Estranho não lê -------------------------------------------------------
let denied = false;
try {
  execFileSync(
    'psql',
    [
      '-tA',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `BEGIN;
         SET LOCAL client_min_messages = warning;
         INSERT INTO public.organizations (id, name, slug, created_by)
           VALUES ('${ORG}', 'gate-183c', 'gate-183c', '${ACTOR}');
         SELECT set_config('request.jwt.claims', json_build_object('sub', '${STRANGER}')::text, true);
         SELECT * FROM public.${FN}('${ORG}');
       ROLLBACK;`,
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
} catch (e) {
  denied = /insufficient_privilege|sem acesso/i.test(String(e.stderr ?? e.message));
}
check('ISOLAMENTO', denied, 'não-membro conseguiu listar as séries da organização');

if (failures.length > 0) {
  console.error('❌ Gate de séries crônicas (Onda 183) reprovado:');
  for (const f of failures) console.error(`   • ${f}`);
  process.exit(1);
}
console.log('✅ Gate de séries crônicas (Onda 183) aprovado.');
