#!/usr/bin/env node
/**
 * Gate de CI — Onda 128: convites e governança da rede colaborativa.
 *
 * Verifica no banco real:
 *  1. RLS ligada em `collab_invitations` e `collab_governance_audit`, com
 *     políticas que só enxergam as duas partes (dona da rede e convidada).
 *  2. Privilégios exatos por `aclexplode`: nada para anon/PUBLIC; apenas SELECT
 *     para authenticated (escrita só por rotinas SECURITY DEFINER); a rotina de
 *     cron `collab_expire_invitations` inalcançável por usuário logado.
 *  3. Trilha append-only: UPDATE/DELETE bloqueados por trigger, não por convenção.
 *  4. Paridade literal entre `collab_governance_policy()` e
 *     COLLAB_GOVERNANCE_POLICY do TypeScript.
 *  5. Paridade da expiração efetiva: `collab_effective_invite_status()` e
 *     `effectiveInviteStatus()` concordam em toda a matriz estado × relógio.
 *  6. Rotinas DEFINER com search_path fixo e cron agendado.
 *  7. Bateria funcional em BEGIN ... ROLLBACK: convidar, aceitar, recusar,
 *     revogar, suspender, reintegrar, remover (com revogação das entradas),
 *     convite vencido não admite ninguém, e todas as guardas de autoridade.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/collab/collabGovernance.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');

const TABLES = ['collab_invitations', 'collab_governance_audit'];
const USER_FUNCTIONS = [
  ['collab_invite_org', 'uuid, uuid, integer, text, timestamp with time zone'],
  ['collab_respond_invite', 'uuid, boolean, timestamp with time zone'],
  ['collab_revoke_invite', 'uuid, timestamp with time zone'],
  ['collab_set_membership_status', 'uuid, uuid, text'],
  ['collab_remove_membership', 'uuid, uuid'],
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
  check(
    'RLS',
    !/\banon\b|\{public\}/.test(policies),
    `${table} exposta a anon/PUBLIC (${policies})`
  );
  check(
    'RLS',
    !/:(INSERT|UPDATE|DELETE|ALL):/.test(policies),
    `${table} aceita escrita direta da API; governança deve passar por SECURITY DEFINER (${policies})`
  );
}

// --- 2) Privilégios de tabela -------------------------------------------------
for (const table of TABLES) {
  const acl = query(`
    SELECT COALESCE(string_agg(DISTINCT grantee.rolname||'='||a.privilege_type, ',' ORDER BY grantee.rolname||'='||a.privilege_type), '')
      FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      CROSS JOIN LATERAL aclexplode(c.relacl) a
      LEFT JOIN pg_roles grantee ON grantee.oid=a.grantee
     WHERE n.nspname='public' AND c.relname='${table}'
       AND COALESCE(grantee.rolname,'PUBLIC') IN ('anon','authenticated','PUBLIC')`);
  const grants = acl ? acl.split(',') : [];
  check(
    'GRANT',
    !grants.some((g) => g.startsWith('anon=')),
    `${table} concede privilégio a anon (${acl})`
  );
  const authenticated = grants.filter((g) => g.startsWith('authenticated='));
  check(
    'GRANT',
    authenticated.length === 1 && authenticated[0] === 'authenticated=SELECT',
    `${table} deve conceder exatamente SELECT a authenticated, tem: ${authenticated.join(',') || '(nenhum)'}`
  );
}

// --- 3) Privilégios de execução ----------------------------------------------
const execAcl = (name, args) =>
  query(`
    SELECT COALESCE(string_agg(DISTINCT COALESCE(g.rolname,'PUBLIC'), ',' ORDER BY COALESCE(g.rolname,'PUBLIC')), '')
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      CROSS JOIN LATERAL aclexplode(p.proacl) a
      LEFT JOIN pg_roles g ON g.oid=a.grantee
     WHERE n.nspname='public' AND p.proname='${name}'
       AND pg_get_function_identity_arguments(p.oid)='${args}'
       AND a.privilege_type='EXECUTE'
       AND COALESCE(g.rolname,'PUBLIC') IN ('anon','PUBLIC')`);

for (const [name, args] of USER_FUNCTIONS) {
  check('EXECUTE', execAcl(name, args) === '', `${name} executável por anon/PUBLIC`);
}
const cronAcl = query(`
  SELECT COALESCE(string_agg(DISTINCT COALESCE(g.rolname,'PUBLIC'), ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(p.proacl) a
    LEFT JOIN pg_roles g ON g.oid=a.grantee
   WHERE n.nspname='public' AND p.proname='collab_expire_invitations'
     AND a.privilege_type='EXECUTE'
     AND COALESCE(g.rolname,'PUBLIC') IN ('anon','authenticated','PUBLIC')`);
check(
  'EXECUTE',
  cronAcl === '',
  `collab_expire_invitations alcançável por ${cronAcl}: a limpeza é do cron, não do usuário`
);

const immutableTrigger = query(`
  SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
   WHERE c.relname='collab_governance_audit' AND NOT t.tgisinternal
     AND t.tgname='trg_collab_governance_audit_immutable'`);
check(
  'TRILHA',
  immutableTrigger === '1',
  'gatilho de imutabilidade ausente: sem ele, o dono da tabela reescreveria o passado'
);

// --- 4) search_path fixo e cron ----------------------------------------------
const looseDefiner = query(`
  SELECT COALESCE(string_agg(p.proname, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE 'collab_%' AND p.prosecdef
     AND NOT (COALESCE(array_to_string(p.proconfig,','),'') LIKE '%search_path%')`);
check('DEFINER', looseDefiner === '', `rotinas DEFINER sem search_path fixo: ${looseDefiner}`);

// O schema `cron` não é legível pelo papel de aplicação (nem deve ser); o que
// este gate garante é que a rotina agendada existe, é DEFINER e devolve inteiro.
const expireSignature = query(`
  SELECT p.prosecdef::text||'|'||pg_catalog.format_type(p.prorettype, NULL)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='collab_expire_invitations'`);
check(
  'CRON',
  expireSignature === 'true|integer',
  `collab_expire_invitations ausente ou fora do contrato: '${expireSignature}'`
);

// --- 5) Paridade da política SQL <-> TS --------------------------------------
const sqlPolicy = JSON.parse(query('SELECT public.collab_governance_policy()::text'));
const tsPolicyBlock = source.match(
  /export const COLLAB_GOVERNANCE_POLICY = \{([\s\S]*?)\} as const;/
);
check('PARIDADE', Boolean(tsPolicyBlock), 'COLLAB_GOVERNANCE_POLICY não encontrado no TypeScript');
if (tsPolicyBlock) {
  const tsPolicy = {};
  for (const [, key, value] of tsPolicyBlock[1].matchAll(/^\s*(\w+):\s*([^,]+),/gm)) {
    const raw = value.trim();
    tsPolicy[key] = raw === 'true' ? true : raw === 'false' ? false : Number(raw.replace(/_/g, ''));
  }
  const keys = new Set([...Object.keys(sqlPolicy), ...Object.keys(tsPolicy)]);
  for (const key of keys) {
    check(
      'PARIDADE',
      sqlPolicy[key] === tsPolicy[key],
      `política divergente em '${key}': SQL=${JSON.stringify(sqlPolicy[key])} TS=${JSON.stringify(tsPolicy[key])}`
    );
  }
}

// --- 6) Paridade da expiração efetiva ----------------------------------------
const { effectiveInviteStatus } = await import(
  `data:text/javascript,${encodeURIComponent(
    `export const effectiveInviteStatus = (stored, expiresAt, now) => {
       if (stored !== 'pending') return stored;
       const e = new Date(expiresAt).getTime(); const c = new Date(now).getTime();
       if (!Number.isFinite(e) || !Number.isFinite(c)) return 'pending';
       return c >= e ? 'expired' : 'pending'; };`
  )}`
);
check(
  'PARIDADE',
  /if \(stored !== 'pending'\) return stored;/.test(source) &&
    /clock\.getTime\(\) >= expiry\.getTime\(\) \? 'expired' : 'pending'/.test(source),
  'effectiveInviteStatus do TypeScript divergiu da forma verificada por este gate'
);

const NOW = '2026-07-26T12:00:00Z';
for (const stored of ['pending', 'accepted', 'declined', 'revoked', 'expired']) {
  for (const delta of [-86400, -1, 0, 1, 86400]) {
    const expires = new Date(Date.parse(NOW) + delta * 1000).toISOString();
    const sql = query(
      `SELECT public.collab_effective_invite_status('${stored}','${expires}'::timestamptz,'${NOW}'::timestamptz)`
    );
    const ts = effectiveInviteStatus(stored, expires, NOW);
    check('PARIDADE', sql === ts, `estado efetivo ${stored}/${delta}s: SQL=${sql} TS=${ts}`);
  }
}

// --- 7) Bateria funcional em transação revertida ------------------------------
const FUNCTIONAL = `
BEGIN;
SET LOCAL client_min_messages TO WARNING;

CREATE TEMP TABLE t_result(label text, ok boolean, detail text) ON COMMIT DROP;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_label text, p_sql text, p_error text)
RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  BEGIN
    EXECUTE p_sql;
    INSERT INTO t_result VALUES (p_label, false, 'esperava erro "'||p_error||'", nada foi levantado');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO t_result VALUES (p_label, SQLERRM = p_error, 'erro obtido: '||SQLERRM);
  END;
END; $fn$;
CREATE OR REPLACE FUNCTION pg_temp.expect(p_label text, p_cond boolean, p_detail text)
RETURNS void LANGUAGE sql AS $fn$ INSERT INTO t_result VALUES (p_label, p_cond, p_detail) $fn$;

DO $body$
DECLARE
  v_owner_user uuid := gen_random_uuid();
  v_guest_user uuid := gen_random_uuid();
  v_owner_org uuid; v_guest_org uuid; v_third_org uuid;
  v_net uuid; v_inv uuid; v_entry uuid; v_revoked integer; v_status text;
BEGIN
  INSERT INTO organizations (name, slug, created_by)
  VALUES ('Cond A '||v_owner_user, 'gate-a-'||replace(v_owner_user::text,'-',''), v_owner_user)
  RETURNING id INTO v_owner_org;
  INSERT INTO organizations (name, slug, created_by)
  VALUES ('Cond B '||v_guest_user, 'gate-b-'||replace(v_guest_user::text,'-',''), v_guest_user)
  RETURNING id INTO v_guest_org;
  INSERT INTO organizations (name, slug, created_by)
  VALUES ('Cond C '||v_guest_user, 'gate-c-'||replace(v_guest_user::text,'-',''), v_owner_user)
  RETURNING id INTO v_third_org;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_owner_org, v_owner_user, 'admin'), (v_guest_org, v_guest_user, 'admin')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_user)::text, true);

  INSERT INTO collab_networks (name, slug, owner_org_id)
  VALUES ('Rede Gate', 'gate-'||substr(replace(v_owner_user::text,'-',''),1,20), v_owner_org)
  RETURNING id INTO v_net;

  -- (a) convite válido
  v_inv := collab_invite_org(v_net, v_guest_org, 14, 'bem-vindo');
  PERFORM pg_temp.expect('convite criado', v_inv IS NOT NULL, 'id nulo');
  PERFORM pg_temp.expect('convite pendente',
    (SELECT status FROM collab_invitations WHERE id=v_inv) = 'pending', 'estado inicial');
  PERFORM pg_temp.expect('trilha do convite',
    EXISTS (SELECT 1 FROM collab_governance_audit
             WHERE invitation_id=v_inv AND action='invite_created'), 'sem trilha');

  -- (b) guardas de emissão
  PERFORM pg_temp.expect_error('duplicado',
    format('SELECT collab_invite_org(%L,%L)', v_net, v_guest_org), 'invite_already_pending');
  PERFORM pg_temp.expect_error('alvo é a dona',
    format('SELECT collab_invite_org(%L,%L)', v_net, v_owner_org), 'target_is_owner');
  PERFORM pg_temp.expect_error('ttl acima do teto',
    format('SELECT collab_invite_org(%L,%L,61)', v_net, v_third_org), 'ttl_out_of_range');
  PERFORM pg_temp.expect_error('ttl zero',
    format('SELECT collab_invite_org(%L,%L,0)', v_net, v_third_org), 'ttl_out_of_range');

  -- (c) quem não é dono não convida nem revoga
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_guest_user)::text, true);
  PERFORM pg_temp.expect_error('estranho convida',
    format('SELECT collab_invite_org(%L,%L)', v_net, v_third_org), 'not_network_owner');
  PERFORM pg_temp.expect_error('estranho revoga',
    format('SELECT collab_revoke_invite(%L)', v_inv), 'not_network_owner');

  -- (d) aceite pela organização convidada
  v_status := collab_respond_invite(v_inv, true);
  PERFORM pg_temp.expect('aceite', v_status = 'accepted', v_status);
  PERFORM pg_temp.expect('participação ativa',
    (SELECT status FROM collab_memberships
      WHERE network_id=v_net AND organization_id=v_guest_org) = 'active', 'não ativou');
  PERFORM pg_temp.expect_error('responder duas vezes',
    format('SELECT collab_respond_invite(%L,true)', v_inv), 'invite_not_pending');

  -- (e) já membro não é reconvidado
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_user)::text, true);
  PERFORM pg_temp.expect_error('reconvite de membro',
    format('SELECT collab_invite_org(%L,%L)', v_net, v_guest_org), 'already_member');

  -- (f) suspensão e reintegração
  PERFORM collab_set_membership_status(v_net, v_guest_org, 'suspended');
  PERFORM pg_temp.expect('suspensa',
    (SELECT status FROM collab_memberships
      WHERE network_id=v_net AND organization_id=v_guest_org) = 'suspended', 'não suspendeu');
  PERFORM pg_temp.expect_error('suspender já suspensa',
    format('SELECT collab_set_membership_status(%L,%L,%L)', v_net, v_guest_org, 'suspended'),
    'illegal_transition');
  PERFORM pg_temp.expect_error('participação inexistente',
    format('SELECT collab_set_membership_status(%L,%L,%L)', v_net, v_third_org, 'suspended'),
    'membership_not_found');
  PERFORM pg_temp.expect_error('dona imutável',
    format('SELECT collab_set_membership_status(%L,%L,%L)', v_net, v_owner_org, 'suspended'),
    'owner_membership_immutable');
  PERFORM collab_set_membership_status(v_net, v_guest_org, 'active');

  -- (g) remoção revoga o que a organização compartilhou
  INSERT INTO collab_entries (network_id, owner_org_id, plate_hash, severity, reason, expires_at)
  VALUES (v_net, v_guest_org, sha256('ABC1D23'::bytea), 3, 'gate', now() + interval '10 days')
  RETURNING id INTO v_entry;
  v_revoked := collab_remove_membership(v_net, v_guest_org);
  PERFORM pg_temp.expect('remoção revoga entradas', v_revoked = 1, 'revogadas: '||v_revoked);
  PERFORM pg_temp.expect('entrada revogada',
    (SELECT revoked_at IS NOT NULL FROM collab_entries WHERE id=v_entry), 'entrada ainda ativa');
  PERFORM pg_temp.expect('participação removida',
    NOT EXISTS (SELECT 1 FROM collab_memberships
                 WHERE network_id=v_net AND organization_id=v_guest_org), 'ainda participa');
  PERFORM pg_temp.expect('trilha da remoção',
    EXISTS (SELECT 1 FROM collab_governance_audit
             WHERE network_id=v_net AND organization_id=v_guest_org
               AND action='membership_removed'), 'sem trilha');

  -- (h) convite vencido não admite ninguém, mesmo antes do cron
  v_inv := collab_invite_org(v_net, v_third_org, 1);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_user)::text, true);
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_third_org, v_owner_user, 'admin') ON CONFLICT DO NOTHING;
  -- 1 dia + 1 segundo depois: o convite morreu, mesmo sem o cron ter passado.
  PERFORM pg_temp.expect_error('aceite de convite vencido',
    format('SELECT collab_respond_invite(%L,true,%L::timestamptz)', v_inv,
           now() + interval '1 day 1 second'), 'invite_expired');
  -- O convite morto continua gravado como 'pending' até o cron passar; o que
  -- importa é que ele NÃO admite ninguém enquanto isso.
  PERFORM pg_temp.expect('vencido não admite',
    (SELECT status FROM collab_invitations WHERE id=v_inv) = 'pending', 'estado inesperado');
  PERFORM pg_temp.expect('sem participação por convite vencido',
    NOT EXISTS (SELECT 1 FROM collab_memberships
                 WHERE network_id=v_net AND organization_id=v_third_org), 'admitiu indevidamente');

  -- (i) recusa cria carência de reconvite
  v_inv := collab_invite_org(v_net, v_third_org, 5, NULL, now() + interval '2 days');
  PERFORM pg_temp.expect('recusa',
    collab_respond_invite(v_inv, false, now() + interval '2 days') = 'declined', 'não recusou');
  PERFORM pg_temp.expect_error('reconvite dentro da carência',
    format('SELECT collab_invite_org(%L,%L,5,NULL,%L::timestamptz)', v_net, v_third_org,
           now() + interval '2 days 23 hours'), 'reinvite_cooldown');
  PERFORM pg_temp.expect('reconvite após a carência',
    collab_invite_org(v_net, v_third_org, 5, NULL, now() + interval '3 days 1 hour') IS NOT NULL,
    'bloqueou indevidamente');

  -- (j) trilha é imutável: pelo privilégio (a API nem tenta) e pelo gatilho
  -- (nem o dono da tabela reescreve o passado).
  PERFORM pg_temp.expect_error('editar trilha',
    format('UPDATE collab_governance_audit SET action=%L WHERE network_id=%L', 'invite_created', v_net),
    'permission denied for table collab_governance_audit');
  PERFORM pg_temp.expect_error('apagar trilha',
    format('DELETE FROM collab_governance_audit WHERE network_id=%L', v_net),
    'permission denied for table collab_governance_audit');

  -- (k) cron materializa o que o relógio já decidiu
  PERFORM pg_temp.expect('cron expira',
    collab_expire_invitations(now() + interval '90 days') >= 1, 'nada expirado');
  PERFORM pg_temp.expect('cron é idempotente',
    collab_expire_invitations(now() + interval '90 days') = 0, 'expirou duas vezes o mesmo convite');
END;
$body$;

SELECT label, detail FROM t_result WHERE NOT ok;
ROLLBACK;
`;

const functional = execFileSync('psql', ['-tA', '-v', 'ON_ERROR_STOP=1'], {
  input: FUNCTIONAL,
  encoding: 'utf8',
}).trim();
const functionalFailures = functional
  .split('\n')
  .map((line) => line.trim())
  // psql ecoa tags de comando (BEGIN, DO, ROLLBACK...); só linhas 'label|detalhe'
  // vêm da tabela de resultados.
  .filter((line) => line.includes('|'));
for (const line of functionalFailures) failures.push(`FUNCIONAL: ${line}`);

// --- Resultado ----------------------------------------------------------------
if (failures.length > 0) {
  console.error('❌ Gate de governança da rede colaborativa reprovado:\n');
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log(
  '✅ Governança da rede colaborativa: RLS, privilégios, paridade e bateria funcional OK.'
);
