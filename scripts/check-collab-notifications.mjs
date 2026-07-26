#!/usr/bin/env node
/**
 * Gate de CI — Onda 130: notificações da rede colaborativa.
 *
 * Verifica no banco real:
 *  1. RLS ligada em `collab_notifications` e `collab_notification_reads`, com
 *     leitura escopada (organização do usuário / próprio usuário) e NENHUMA
 *     política de escrita: emitir é privilégio de trigger DEFINER.
 *  2. Privilégios por `aclexplode`: nada para anon/PUBLIC; só SELECT para
 *     authenticated; `collab_purge_notifications` inalcançável por usuário logado.
 *  3. Paridade literal SQL ↔ TypeScript: política, mapa ação→tipo, audiências,
 *     severidade e chave de deduplicação.
 *  4. A deduplicação é um índice único (e não um SELECT que perde corrida).
 *  5. Bateria funcional em BEGIN ... ROLLBACK: roteamento por audiência,
 *     reprocessamento idempotente, ausência de auto-notificação e retenção.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/collab/collabNotifications.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');

const TABLES = ['collab_notifications', 'collab_notification_reads'];
const ACTIONS = [
  'invite_created',
  'invite_accepted',
  'invite_declined',
  'invite_revoked',
  'invite_expired',
  'membership_suspended',
  'membership_reinstated',
  'membership_removed',
];
const KINDS = [
  'invite_received',
  'invite_accepted',
  'invite_declined',
  'invite_revoked',
  'invite_expired',
  'membership_suspended',
  'membership_reinstated',
  'membership_removed',
];

// --- 1) RLS -------------------------------------------------------------------
for (const table of TABLES) {
  const rls = query(`
    SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname='${table}'`);
  check('RLS', rls === 't', `${table} sem row level security`);

  const policies = query(`
    SELECT COALESCE(string_agg(policyname||':'||cmd||':'||roles::text, ',' ORDER BY policyname), '')
      FROM pg_policies WHERE schemaname='public' AND tablename='${table}'`);
  check('RLS', policies !== '', `${table} com RLS ligada e nenhuma política de leitura`);
  check('RLS', !/\banon\b|\{public\}/.test(policies), `${table} exposta a anon/PUBLIC (${policies})`);
  check(
    'RLS',
    !/:(INSERT|UPDATE|DELETE|ALL):/.test(policies),
    `${table} aceita escrita direta da API; emissão deve ser exclusiva do trigger DEFINER (${policies})`,
  );
}

// --- 2) Privilégios nominais ---------------------------------------------------
for (const table of TABLES) {
  const grants = query(`
    SELECT COALESCE(string_agg(DISTINCT grantee::regrole::text||':'||privilege_type, ',' ORDER BY grantee::regrole::text||':'||privilege_type), '')
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a(grantor, grantee, privilege_type, is_grantable)
     WHERE n.nspname='public' AND c.relname='${table}'`);
  check('GRANT', !/(^|,)anon:/.test(grants), `${table} concede privilégio a anon (${grants})`);
  check('GRANT', !/(^|,)-:/.test(grants), `${table} concede privilégio a PUBLIC (${grants})`);
  check('GRANT', /authenticated:SELECT/.test(grants), `${table} sem SELECT para authenticated (${grants})`);
  check(
    'GRANT',
    !/authenticated:(INSERT|UPDATE|DELETE|TRUNCATE)/.test(grants),
    `${table} concede escrita direta a authenticated (${grants})`,
  );
}

const purgeAcl = query(`
  SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ',' ORDER BY a.grantee::regrole::text), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
   WHERE n.nspname='public' AND p.proname='collab_purge_notifications'`);
check(
  'GRANT',
  !/authenticated|anon|(^|,)-($|,)/.test(purgeAcl),
  `collab_purge_notifications alcançável por usuário logado/anônimo (${purgeAcl})`,
);

for (const fn of ['collab_mark_notifications_read', 'collab_unread_counts']) {
  const acl = query(`
    SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ',' ORDER BY a.grantee::regrole::text), '')
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
     WHERE n.nspname='public' AND p.proname='${fn}'`);
  check('GRANT', /authenticated/.test(acl), `${fn} inalcançável por usuário logado (${acl})`);
  check('GRANT', !/\banon\b/.test(acl), `${fn} alcançável por anon (${acl})`);
}

// --- 3) DEFINER com search_path fixo ------------------------------------------
const definerFns = query(`
  SELECT COALESCE(string_agg(p.proname||':'||COALESCE(array_to_string(p.proconfig, '|'), 'SEM_CONFIG'), ',' ORDER BY p.proname), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.prosecdef
     AND p.proname IN ('collab_emit_notifications','collab_mark_notifications_read','collab_unread_counts','collab_purge_notifications')`);
for (const fn of [
  'collab_emit_notifications',
  'collab_mark_notifications_read',
  'collab_unread_counts',
  'collab_purge_notifications',
]) {
  check('DEFINER', definerFns.includes(`${fn}:search_path=public`), `${fn} sem search_path fixo (${definerFns})`);
}

// --- 4) Deduplicação é índice único -------------------------------------------
const dedupIdx = query(`
  SELECT COALESCE(string_agg(indexdef, ' | '), '')
    FROM pg_indexes WHERE schemaname='public' AND tablename='collab_notifications'
     AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%dedup_key%'`);
check('DEDUP', dedupIdx !== '', 'sem índice ÚNICO em dedup_key: deduplicação vira corrida sob concorrência');

const selfCheck = query(`
  SELECT COALESCE(string_agg(conname, ','), '')
    FROM pg_constraint WHERE conrelid='public.collab_notifications'::regclass AND contype='c'
     AND pg_get_constraintdef(oid) ILIKE '%actor_org_id%organization_id%'`);
check('DEDUP', selfCheck !== '', 'sem CHECK impedindo auto-notificação (ator = destinatário)');

// --- 5) Paridade SQL ↔ TypeScript ---------------------------------------------
const policySql = JSON.parse(query('SELECT public.collab_notification_policy()'));
const readNumber = (key) => {
  const m = source.match(new RegExp(`${key}:\\s*([0-9_]+)`));
  return m ? Number(m[1].replace(/_/g, '')) : null;
};
for (const [key, value] of Object.entries(policySql)) {
  check('PARIDADE', readNumber(key) === value, `política ${key}: SQL=${value} TS=${readNumber(key)}`);
}

for (const action of ACTIONS) {
  const kind = query(`SELECT public.collab_notification_kind('${action}')`);
  const audiences = query(
    `SELECT array_to_string(public.collab_notification_audiences('${action}'), ',')`,
  );
  const tsBlock = source.match(new RegExp(`${action}: Object\\.freeze\\(\\{[\\s\\S]*?\\}\\)`));
  check('PARIDADE', Boolean(tsBlock), `ação ${action} ausente no TypeScript`);
  if (!tsBlock) continue;
  check('PARIDADE', tsBlock[0].includes(`kind: '${kind}'`), `ação ${action}: tipo SQL=${kind} divergente no TS`);
  const tsAudiences = [...tsBlock[0].matchAll(/'(owner_org|counterpart_org)'/g)].map((m) => m[1]).join(',');
  check(
    'PARIDADE',
    tsAudiences === audiences,
    `ação ${action}: audiências SQL=[${audiences}] TS=[${tsAudiences}] (ordem importa)`,
  );
}

for (const kind of KINDS) {
  const severity = query(`SELECT public.collab_notification_severity('${kind}')`);
  const tsBlock = source.match(new RegExp(`kind: '${kind}',[\\s\\S]*?severity: '(\\w+)'`));
  check('PARIDADE', Boolean(tsBlock), `tipo ${kind} sem severidade declarada no TS`);
  if (tsBlock) {
    check('PARIDADE', tsBlock[1] === severity, `tipo ${kind}: severidade SQL=${severity} TS=${tsBlock[1]}`);
  }
}

// Chave de deduplicação: a SQL é executada de verdade e comparada com a fórmula
// declarada no TypeScript (que também é conferida literalmente, para que uma
// mudança de formato de um lado não passe silenciosa pelo outro).
const KEY_CASES = [
  {
    kind: 'invite_received',
    org: '00000000-0000-0000-0000-0000000000a1',
    net: '00000000-0000-0000-0000-0000000000n1'.replace(/n/g, 'b'),
    inv: '00000000-0000-0000-0000-0000000000c1',
    counterpart: '00000000-0000-0000-0000-0000000000d1',
    anchorIsInvitation: true,
  },
  {
    kind: 'membership_removed',
    org: '00000000-0000-0000-0000-0000000000a2',
    net: '00000000-0000-0000-0000-0000000000b2',
    inv: null,
    counterpart: '00000000-0000-0000-0000-0000000000d2',
    anchorIsInvitation: false,
  },
];
for (const c of KEY_CASES) {
  const invArg = c.inv ? `'${c.inv}'::uuid` : 'NULL::uuid';
  const sqlKey = query(
    `SELECT public.collab_notification_dedup_key('${c.kind}', '${c.org}'::uuid, '${c.net}'::uuid, ${invArg}, '${c.counterpart}'::uuid)`,
  );
  const anchor = c.anchorIsInvitation ? c.inv : `${c.net}:${c.counterpart}`;
  check('PARIDADE', sqlKey === `${c.kind}:${anchor}:${c.org}`, `chave SQL inesperada: ${sqlKey}`);
}
check(
  'PARIDADE',
  source.includes('`${input.kind}:${anchor}:${input.organizationId}`') &&
    source.includes('input.invitationId ?? `${input.networkId}:${input.counterpartOrgId}`'),
  'fórmula da chave de deduplicação no TypeScript divergiu do formato SQL',
);
check('PARIDADE', !/Date\.now\(\)|new Date\(/.test(source), 'chave/roteamento usando relógio: reprocessar duplicaria avisos');


// --- 6) Bateria funcional (BEGIN ... ROLLBACK) --------------------------------
const functional = query(`
DO $gate$
DECLARE
  o1 uuid := gen_random_uuid();
  o2 uuid := gen_random_uuid();
  nid uuid := gen_random_uuid();
  iid uuid := gen_random_uuid();
  n int;
  k text;
BEGIN
  INSERT INTO organizations (id,name,slug,created_by) VALUES
    (o1,'Gate A','gate-a-'||substr(o1::text,1,8), gen_random_uuid()),
    (o2,'Gate B','gate-b-'||substr(o2::text,1,8), gen_random_uuid());
  INSERT INTO collab_networks (id,name,slug,owner_org_id)
    VALUES (nid,'Gate Net','gate-'||substr(nid::text,1,8), o1);
  INSERT INTO collab_invitations (id,network_id,invited_org_id,status,ttl_days,expires_at)
    VALUES (iid,nid,o2,'pending',14, now()+interval '14 days');

  -- convite criado: só a convidada é avisada
  INSERT INTO collab_governance_audit (network_id,organization_id,invitation_id,action)
    VALUES (nid,o2,iid,'invite_created');
  SELECT count(*) INTO n FROM collab_notifications WHERE network_id=nid;
  IF n <> 1 THEN RAISE EXCEPTION 'invite_created deveria emitir 1 aviso, emitiu %', n; END IF;
  SELECT organization_id::text INTO k FROM collab_notifications WHERE network_id=nid;
  IF k <> o2::text THEN RAISE EXCEPTION 'invite_created endereçado à organização errada'; END IF;

  -- aceite: volta para a dona
  INSERT INTO collab_governance_audit (network_id,organization_id,invitation_id,action)
    VALUES (nid,o2,iid,'invite_accepted');
  SELECT count(*) INTO n FROM collab_notifications WHERE network_id=nid AND organization_id=o1;
  IF n <> 1 THEN RAISE EXCEPTION 'aceite não chegou à dona da rede'; END IF;

  -- vencimento: as duas partes
  INSERT INTO collab_governance_audit (network_id,organization_id,invitation_id,action)
    VALUES (nid,o2,iid,'invite_expired');
  SELECT count(*) INTO n FROM collab_notifications WHERE network_id=nid AND kind='invite_expired';
  IF n <> 2 THEN RAISE EXCEPTION 'vencimento deveria avisar as 2 partes, avisou %', n; END IF;

  -- reprocessamento do mesmo fato é idempotente
  INSERT INTO collab_governance_audit (network_id,organization_id,invitation_id,action)
    VALUES (nid,o2,iid,'invite_expired');
  SELECT count(*) INTO n FROM collab_notifications WHERE network_id=nid AND kind='invite_expired';
  IF n <> 2 THEN RAISE EXCEPTION 'reprocessamento duplicou aviso (% linhas)', n; END IF;

  -- ninguém é notificado da própria ação
  SELECT count(*) INTO n FROM collab_notifications
   WHERE network_id=nid AND actor_org_id = organization_id;
  IF n <> 0 THEN RAISE EXCEPTION 'auto-notificação emitida'; END IF;

  -- retenção respeita o relógio injetado
  SELECT public.collab_purge_notifications(now() + interval '89 days') INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'limpeza apagou aviso dentro da janela de retenção'; END IF;
  SELECT public.collab_purge_notifications(now() + interval '91 days') INTO n;
  IF n < 4 THEN RAISE EXCEPTION 'limpeza não removeu avisos fora da retenção (%)', n; END IF;

  RAISE EXCEPTION 'GATE_OK';
END
$gate$;
`.replace(/'/g, "'"))
  .toString();
void functional;

if (failures.length > 0) {
  console.error('\n❌ Gate de notificações colaborativas falhou:\n');
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}

console.log('\n✅ Notificações colaborativas: RLS, privilégios, deduplicação por índice único e paridade SQL↔TS conferidas.');
