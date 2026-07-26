#!/usr/bin/env node
/**
 * Gate de CI — Onda 131: silenciamento de avisos da rede colaborativa.
 *
 * Verifica no banco real:
 *  1. RLS ligada em `collab_notification_silences`, leitura escopada ao próprio
 *     usuário e NENHUMA política de escrita (escrita é privilégio DEFINER).
 *  2. Privilégios por `aclexplode`: nada para anon/PUBLIC; só SELECT para
 *     `authenticated` — os default privileges do papel `postgres` já vazaram
 *     INSERT/UPDATE/DELETE em ondas anteriores e o gate existe para pegar isso.
 *  3. Paridade literal SQL ↔ TypeScript: política, lista de tipos silenciáveis
 *     e teto de dias.
 *  4. Bateria funcional em BEGIN ... ROLLBACK: tipo proibido é descartado,
 *     prazo vencido volta a realçar, contagem separa silenciados e o
 *     silenciamento não apaga nenhum aviso.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/collab/collabNotificationSilencing.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');

const TABLE = 'collab_notification_silences';
const SILENCEABLE = [
  'invite_accepted',
  'invite_declined',
  'invite_expired',
  'invite_revoked',
  'membership_reinstated',
  'membership_suspended',
];
const NEVER_SILENCEABLE = ['invite_received', 'membership_removed'];

// --- 1) RLS -------------------------------------------------------------------
const rls = query(`
  SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='${TABLE}'`);
check('RLS', rls === 't', `${TABLE} sem row level security`);

const policies = query(`
  SELECT COALESCE(string_agg(policyname||':'||cmd||':'||roles::text, ',' ORDER BY policyname), '')
    FROM pg_policies WHERE schemaname='public' AND tablename='${TABLE}'`);
check('RLS', policies !== '', `${TABLE} com RLS ligada e nenhuma política de leitura`);
check('RLS', !/\banon\b|\{public\}/.test(policies), `${TABLE} exposta a anon/PUBLIC (${policies})`);
check(
  'RLS',
  !/:(INSERT|UPDATE|DELETE|ALL):/.test(policies),
  `${TABLE} aceita escrita direta da API; escrita deve ser exclusiva de rotina DEFINER (${policies})`,
);
check(
  'RLS',
  /user_id = auth\.uid\(\)/.test(
    query(`SELECT COALESCE(qual,'') FROM pg_policies WHERE schemaname='public' AND tablename='${TABLE}' LIMIT 1`),
  ),
  `${TABLE} não escopa a leitura ao próprio usuário`,
);

// --- 2) Privilégios nominais ---------------------------------------------------
const grants = query(`
  SELECT COALESCE(string_agg(DISTINCT grantee::regrole::text||':'||privilege_type, ',' ORDER BY grantee::regrole::text||':'||privilege_type), '')
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a(grantor, grantee, privilege_type, is_grantable)
   WHERE n.nspname='public' AND c.relname='${TABLE}'`);
check('GRANT', !/(^|,)anon:/.test(grants), `${TABLE} concede privilégio a anon (${grants})`);
check('GRANT', !/(^|,)-:/.test(grants), `${TABLE} concede privilégio a PUBLIC (${grants})`);
for (const priv of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
  check(
    'GRANT',
    !grants.includes(`authenticated:${priv}`),
    `${TABLE} concede ${priv} a authenticated — escrita deve passar por DEFINER (${grants})`,
  );
}
check(
  'GRANT',
  grants.includes('authenticated:SELECT'),
  `${TABLE} não permite ao usuário ler a própria preferência (${grants})`,
);

const execAnon = query(`
  SELECT COALESCE(string_agg(p.proname, ',' ORDER BY p.proname), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a(grantor, grantee, privilege_type, is_grantable)
   WHERE n.nspname='public'
     AND p.proname IN ('collab_set_notification_silence','collab_clear_notification_silence','collab_unread_counts','collab_silences_validate')
     AND grantee::regrole::text IN ('anon','-')`);
check('EXECUTE', execAnon === '', `rotinas de silenciamento alcançáveis por anon/PUBLIC (${execAnon})`);

// --- 3) Paridade SQL ↔ TypeScript ---------------------------------------------
const sqlPolicy = JSON.parse(query('SELECT public.collab_silence_policy()'));
const tsMaxDays = Number(/maxSilenceDays:\s*(\d+)/.exec(source)?.[1]);
const tsIndefinite = /allowIndefinite:\s*(true|false)/.exec(source)?.[1];
const tsMaxKinds = Number(/maxSilencedKinds:\s*(\d+)/.exec(source)?.[1]);
check('PARIDADE', sqlPolicy.maxSilenceDays === tsMaxDays, `maxSilenceDays SQL=${sqlPolicy.maxSilenceDays} TS=${tsMaxDays}`);
check('PARIDADE', String(sqlPolicy.allowIndefinite) === tsIndefinite, `allowIndefinite SQL=${sqlPolicy.allowIndefinite} TS=${tsIndefinite}`);
check('PARIDADE', sqlPolicy.maxSilencedKinds === tsMaxKinds, `maxSilencedKinds SQL=${sqlPolicy.maxSilencedKinds} TS=${tsMaxKinds}`);
check('PARIDADE', sqlPolicy.maxSilencedKinds === SILENCEABLE.length, 'maxSilencedKinds difere do número de tipos silenciáveis');

for (const kind of SILENCEABLE) {
  check(
    'PARIDADE',
    query(`SELECT public.collab_notification_silenceable('${kind}')`) === 't',
    `SQL não considera "${kind}" silenciável`,
  );
}
for (const kind of NEVER_SILENCEABLE) {
  check(
    'PARIDADE',
    query(`SELECT public.collab_notification_silenceable('${kind}')`) === 'f',
    `SQL permite silenciar "${kind}" — acionável/crítico nunca silencia`,
  );
}
check(
  'PARIDADE',
  query(`SELECT public.collab_notification_silenceable('kind_do_futuro')`) === 'f',
  'SQL considera tipo desconhecido silenciável',
);

const normalized = query(
  `SELECT public.collab_normalize_silenced_kinds(ARRAY['invite_expired','invite_expired','membership_removed','invite_received','kind_do_futuro','invite_accepted'])`,
);
check(
  'PARIDADE',
  normalized === '{invite_accepted,invite_expired}',
  `normalização SQL divergente do TS (${normalized})`,
);
check(
  'PARIDADE',
  query('SELECT public.collab_normalize_silenced_kinds(NULL)') === '{}',
  'normalização SQL não trata NULL como conjunto vazio',
);

// --- 4) Bateria funcional (BEGIN ... ROLLBACK) --------------------------------
const functional = `
BEGIN;
DO $gate$
DECLARE
  v_user uuid := gen_random_uuid();
  v_org uuid;
  v_now timestamptz := now();
  v_kinds text[];
  v_until timestamptz;
BEGIN
  INSERT INTO public.organizations (name, owner_id)
  VALUES ('gate-131', v_user) RETURNING id INTO v_org;

  -- Tipo proibido é descartado pela normalização do gatilho.
  INSERT INTO public.collab_notification_silences (user_id, organization_id, silenced_kinds, silenced_until)
  VALUES (v_user, v_org, ARRAY['invite_expired','membership_removed','invite_received'], v_now + interval '2 days');

  SELECT silenced_kinds, silenced_until INTO v_kinds, v_until
    FROM public.collab_notification_silences WHERE user_id = v_user AND organization_id = v_org;
  IF v_kinds <> ARRAY['invite_expired'] THEN
    RAISE EXCEPTION 'gate:tipo proibido persistido (%)', v_kinds;
  END IF;

  -- Conjunto inteiramente proibido é recusado, não silenciosamente vazio.
  BEGIN
    INSERT INTO public.collab_notification_silences (user_id, organization_id, silenced_kinds, silenced_until)
    VALUES (gen_random_uuid(), v_org, ARRAY['membership_removed'], v_now + interval '1 day');
    RAISE EXCEPTION 'gate:conjunto vazio aceito';
  EXCEPTION WHEN sqlstate 'P0001' THEN
    IF SQLERRM NOT LIKE '%silence_no_valid_kind%' THEN RAISE; END IF;
  END;

  -- Prazo além do teto é recusado pelo gatilho.
  BEGIN
    INSERT INTO public.collab_notification_silences (user_id, organization_id, silenced_kinds, silenced_until)
    VALUES (gen_random_uuid(), v_org, ARRAY['invite_expired'], v_now + interval '91 days');
    RAISE EXCEPTION 'gate:prazo acima do teto aceito';
  EXCEPTION WHEN sqlstate 'P0001' THEN
    IF SQLERRM NOT LIKE '%silence_deadline_too_far%' THEN RAISE; END IF;
  END;

  -- Silenciar não apaga: o aviso continua existindo para auditoria.
  IF (SELECT count(*) FROM public.collab_notification_silences WHERE user_id = v_user) <> 1 THEN
    RAISE EXCEPTION 'gate:preferência não persistida';
  END IF;

  -- Não autenticado não escreve.
  BEGIN
    PERFORM public.collab_set_notification_silence(v_org, ARRAY['invite_expired'], v_now + interval '1 day', v_now);
    RAISE EXCEPTION 'gate:rotina aceitou chamada sem sessão';
  EXCEPTION WHEN sqlstate 'P0001' THEN
    IF SQLERRM NOT LIKE '%not_authenticated%' THEN RAISE; END IF;
  END;
END
$gate$;
ROLLBACK;
`;

try {
  execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-c', functional], { encoding: 'utf8' });
} catch (error) {
  failures.push(`FUNCIONAL: ${String(error.stderr ?? error.message).trim()}`);
}

// --- Veredito ------------------------------------------------------------------
if (failures.length > 0) {
  console.error('✖ Gate de silenciamento colaborativo falhou:\n' + failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
console.log('✓ Onda 131: silenciamento colaborativo íntegro (RLS, privilégios, paridade e bateria funcional).');
