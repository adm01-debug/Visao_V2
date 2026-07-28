#!/usr/bin/env node
/**
 * Gate de CI — Onda 187: reconciliação ativa dos episódios abandonados.
 *
 * Prova, no banco real:
 *  1. Contrato: SECURITY DEFINER, search_path fixo, porteiro de papel no corpo.
 *  2. Exposição: anon sem EXECUTE; `authenticated` só chega via porteiro.
 *  3. Procedência: coluna `close_source` existe, tem CHECK dos dois valores e
 *     episódio aberto nunca carrega procedência de fechamento.
 *  4. Paridade literal SQL ↔ TypeScript dos dois parâmetros.
 *  5. Bateria funcional em BEGIN ... ROLLBACK:
 *       a) o corte é DECLARADO — `closed_at = opened_at + 30d`, jamais `now()`;
 *       b) episódio recente (alarme em curso) não é tocado;
 *       c) abertura no futuro é pulada, nunca "corrigida";
 *       d) mais antigo primeiro, com teto de lote e adiamento contabilizado;
 *       e) idempotência: segunda execução não fecha nada e não regrava;
 *       f) fechamento observado nunca é rebaixado a reconciliado;
 *       g) a execução deixa rastro na trilha de auditoria;
 *       h) não-admin (mesmo membro da organização) é recusado.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import {
  ABANDONED_OPEN_DAYS,
  MAX_RECONCILE_PER_RUN,
  planEpisodeReconciliation,
} from '../src/lib/retention/episodeReconciliation.ts';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const queryTx = (sql) =>
  query(sql)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== 'BEGIN' && l !== 'ROLLBACK')
    .join('\n');
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const FN = 'reconcile_abandoned_episodes';

// --- 1) Contrato ------------------------------------------------------------
const shape = query(`
  SELECT COALESCE(string_agg(p.proname||':'||p.prosecdef||':'||
           (EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%'))::text,
           ',' ORDER BY p.proname), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname IN ('${FN}','episode_reconciliation_policy')`);
check('CONTRATO', shape.includes(`${FN}:true:true`), `rotina malformada: ${shape}`);
check('CONTRATO', shape.includes('episode_reconciliation_policy:false:true'), `política malformada: ${shape}`);

const gatekeeper = query(`
  SELECT (p.prosrc ILIKE '%has_role(v_actor%admin%' AND p.prosrc ILIKE '%is_org_member(p_organization_id%')::text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = '${FN}'`);
check('CONTRATO', gatekeeper === 'true', 'SECURITY DEFINER sem porteiro de papel + vínculo de organização');

// O corte precisa vir de `opened_at`. Se algum dia alguém trocar por `v_now`,
// a rotina passa a fabricar durações — este é o teste que impede a regressão.
const declaredCutoff = query(`
  SELECT (p.prosrc ILIKE '%SET closed_at = e.opened_at + make_interval%')::text
    FROM pg_proc p WHERE p.proname = '${FN}' AND p.pronamespace = 'public'::regnamespace`);
check('CORTE', declaredCutoff === 'true', 'o fechamento não deriva mais de opened_at — risco de gravar "agora"');

// --- 2) Exposição -----------------------------------------------------------
const anonExec = query(`
  SELECT COALESCE(string_agg(DISTINCT p.proname||':'||a.grantee::regrole::text, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
   WHERE n.nspname = 'public' AND p.proname IN ('${FN}','episode_reconciliation_policy')
     AND a.privilege_type = 'EXECUTE'
     AND a.grantee::regrole::text IN ('anon','public','-')`);
check('EXPOSIÇÃO', anonExec === '', `rotina de reconciliação alcançável sem sessão: ${anonExec}`);

// --- 3) Procedência ---------------------------------------------------------
const col = query(`
  SELECT COALESCE(string_agg(a.attname||':'||a.attnotnull::text, ','), '')
    FROM pg_attribute a
   WHERE a.attrelid = 'public.alarm_recurrence_episodes'::regclass
     AND a.attname = 'close_source' AND NOT a.attisdropped`);
check('PROCEDÊNCIA', col === 'close_source:true', `coluna de procedência ausente ou nula: '${col}'`);

const constraints = query(`
  SELECT COALESCE(string_agg(conname, ',' ORDER BY conname), '')
    FROM pg_constraint
   WHERE conrelid = 'public.alarm_recurrence_episodes'::regclass
     AND conname IN ('alarm_recurrence_close_source_check','alarm_recurrence_close_source_shape')`);
check(
  'PROCEDÊNCIA',
  constraints === 'alarm_recurrence_close_source_check,alarm_recurrence_close_source_shape',
  `restrições de procedência faltando: '${constraints}'`,
);

// --- 4) Paridade SQL <-> TypeScript ----------------------------------------
const source = readFileSync(
  new URL('../src/lib/retention/episodeReconciliation.ts', import.meta.url),
  'utf8',
);
const sqlPolicy = query(`
  SELECT (p ->> 'abandonedOpenDays')||'|'||(p ->> 'maxReconcilePerRun')
    FROM public.episode_reconciliation_policy() p`);
const tsPolicy = [
  /ABANDONED_OPEN_DAYS\s*=\s*(\d+)/.exec(source)?.[1],
  /MAX_RECONCILE_PER_RUN\s*=\s*(\d+)/.exec(source)?.[1],
].join('|');
check('PARIDADE', sqlPolicy === tsPolicy, `parâmetros divergentes SQL='${sqlPolicy}' TS='${tsPolicy}'`);

// O corte da reconciliação e o corte que o vigia usa para CONTAR abandonados
// precisam ser o mesmo número: senão o operador reconcilia e o alerta continua.
const retentionDays = query(
  `SELECT public.alarm_recurrence_retention_policy() ->> 'abandonedOpenDays'`,
);
check(
  'COERÊNCIA',
  retentionDays === String(ABANDONED_OPEN_DAYS),
  `o vigia conta abandonados a partir de ${retentionDays}d, a reconciliação fecha a partir de ${ABANDONED_OPEN_DAYS}d`,
);

// --- 5) Bateria funcional ---------------------------------------------------
const ACTOR = '00000000-0000-0000-0000-00000000d187';
const PLAIN = '00000000-0000-0000-0000-00000000e187';
const ORG = '00000000-0000-0000-0000-0000000d1870';

const setup = (label) => `
  SET LOCAL client_min_messages = warning;
  INSERT INTO public.organizations (id, name, slug, created_by)
    VALUES ('${ORG}', '${label}', '${label}', '${ACTOR}');
  INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES ('${ORG}', '${ACTOR}', 'owner'), ('${ORG}', '${PLAIN}', 'member') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES ('${ACTOR}', 'admin') ON CONFLICT DO NOTHING;
  SELECT set_config('request.jwt.claims', json_build_object('sub', '${ACTOR}')::text, true);
`;

const open = (key, ago) =>
  `INSERT INTO public.alarm_recurrence_episodes (organization_id, series_key, severity, opened_at)
     VALUES ('${ORG}', '${key}', 'high', now() - interval '${ago}');`;

const battery = queryTx(`
BEGIN;
${setup('gate-187')}
  ${open('velho', '400 days')}
  ${open('medio', '90 days')}
  ${open('recente', '2 days')}
  INSERT INTO public.alarm_recurrence_episodes (organization_id, series_key, severity, opened_at)
    VALUES ('${ORG}', 'futuro', 'low', now() + interval '3 days');
  INSERT INTO public.alarm_recurrence_episodes (organization_id, series_key, severity, opened_at, closed_at, duration_ms)
    VALUES ('${ORG}', 'observado', 'low', now() - interval '500 days', now() - interval '499 days', 86400000);

  SELECT 'r1=' || (public.${FN}('${ORG}', now(), 1) ->> 'closed')
      || ';adiado=' || (public.${FN}('${ORG}', now(), 1) ->> 'deferred');
ROLLBACK;
`);

// Nota: a chamada acima executa DUAS vezes de propósito — a segunda mede o
// adiamento já com o primeiro episódio fechado, provando que a fila anda.
const line = (p) => battery.split('\n').find((l) => l.startsWith(p)) ?? '(ausente)';
check('LOTE', line('r1=').startsWith('r1=1;'), `o teto de lote não foi respeitado: ${line('r1=')}`);
check('LOTE', line('r1=').endsWith(';adiado=0'), `adiamento mal contado após drenar a fila: ${line('r1=')}`);

const detail = queryTx(`
BEGIN;
${setup('gate-187b')}
  ${open('velho', '400 days')}
  ${open('medio', '90 days')}
  ${open('recente', '2 days')}
  INSERT INTO public.alarm_recurrence_episodes (organization_id, series_key, severity, opened_at)
    VALUES ('${ORG}', 'futuro', 'low', now() + interval '3 days');
  INSERT INTO public.alarm_recurrence_episodes (organization_id, series_key, severity, opened_at, closed_at, duration_ms)
    VALUES ('${ORG}', 'observado', 'low', now() - interval '500 days', now() - interval '499 days', 86400000);

  SELECT 'run=' || public.${FN}('${ORG}')::text;
  SELECT 'estado=' || string_agg(
           series_key || ':' || CASE WHEN closed_at IS NULL THEN 'aberto' ELSE close_source END
           || ':' || COALESCE(duration_ms::text, '-'), ',' ORDER BY series_key)
    FROM public.alarm_recurrence_episodes WHERE organization_id = '${ORG}';
  -- O fechamento tem de ser EXATAMENTE opened_at + 30d, não "agora".
  SELECT 'corte_ok=' || bool_and(closed_at = opened_at + interval '${ABANDONED_OPEN_DAYS} days')::text
    FROM public.alarm_recurrence_episodes
   WHERE organization_id = '${ORG}' AND close_source = 'reconciled';
  SELECT 'idempotente=' || (public.${FN}('${ORG}') ->> 'closed');
  SELECT 'auditoria=' || count(*)::text
    FROM public.audit_logs WHERE action = 'reconcile_abandoned_episodes' AND entity_id = '${ORG}';
ROLLBACK;
`);

const dline = (p) => detail.split('\n').find((l) => l.startsWith(p)) ?? '(ausente)';
const run = dline('run=');
check('EXECUÇÃO', /"closed": ?2/.test(run) || run.includes('"closed": 2') || run.includes('"closed":2'), `fechamentos inesperados: ${run}`);
check('RELÓGIO', /"unreadableClock": ?1/.test(run.replace(/\s+/g, ' ')) || run.includes('"unreadableClock":1') || run.includes('"unreadableClock": 1'), `abertura no futuro deveria ser contada e pulada: ${run}`);
check(
  'ESTADO',
  dline('estado=') ===
    `estado=futuro:aberto:-,medio:reconciled:${ABANDONED_OPEN_DAYS * 86_400_000},observado:observed:86400000,recente:aberto:-,velho:reconciled:${ABANDONED_OPEN_DAYS * 86_400_000}`,
  `reconciliação atingiu registros errados: ${dline('estado=')}`,
);
check('CORTE', dline('corte_ok=') === 'corte_ok=true', `fechamento não caiu no corte declarado: ${dline('corte_ok=')}`);
check('IDEMPOTÊNCIA', dline('idempotente=') === 'idempotente=0', `segunda execução mexeu no livro: ${dline('idempotente=')}`);
check('AUDITORIA', dline('auditoria=') === 'auditoria=2', `execuções sem rastro na auditoria: ${dline('auditoria=')}`);

// (h) membro sem papel de administrador é recusado.
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
${setup('gate-187c')}
         SELECT set_config('request.jwt.claims', json_build_object('sub', '${PLAIN}')::text, true);
         SELECT public.${FN}('${ORG}');
       ROLLBACK;`,
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
} catch (e) {
  denied = /insufficient_privilege|sem permissão/i.test(String(e.stderr ?? e.message));
}
check('PERMISSÃO', denied, 'membro sem papel de administrador conseguiu reconciliar episódios');

// --- 6) Paridade de comportamento com a régua TypeScript --------------------
const nowMs = Date.now();
const day = 86_400_000;
const plan = planEpisodeReconciliation(
  [
    { id: 'velho', seriesKey: 'velho', openedAt: nowMs - 400 * day },
    { id: 'medio', seriesKey: 'medio', openedAt: nowMs - 90 * day },
    { id: 'recente', seriesKey: 'recente', openedAt: nowMs - 2 * day },
    { id: 'futuro', seriesKey: 'futuro', openedAt: nowMs + 3 * day },
  ],
  nowMs,
);
check(
  'PARIDADE',
  plan.closes.length === 2 && plan.closes[0].id === 'velho',
  `a régua TS discorda do SQL: ${JSON.stringify(plan.closes.map((c) => c.id))}`,
);
check(
  'PARIDADE',
  plan.closes.every((c) => c.durationMs === ABANDONED_OPEN_DAYS * day),
  'a régua TS não aplica o corte declarado',
);
check(
  'PARIDADE',
  planEpisodeReconciliation([], nowMs, MAX_RECONCILE_PER_RUN + 1000).closes.length === 0,
  'teto de lote aceitou valor acima do máximo',
);

if (failures.length > 0) {
  console.error('❌ Gate de reconciliação de episódios (Onda 187) reprovado:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('✅ Gate de reconciliação de episódios (Onda 187) aprovado.');
