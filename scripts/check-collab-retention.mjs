#!/usr/bin/env node
/**
 * Gate de CI — Onda 132: retenção justa dos avisos da rede colaborativa.
 *
 * Verifica no banco real:
 *  1. Privilégios e RLS de `collab_notification_purge_runs` (leitura só admin,
 *     nada para anon/PUBLIC, nenhuma escrita pela API).
 *  2. Paridade literal SQL ↔ TypeScript da política e da carência por tipo.
 *  3. Bateria funcional em BEGIN ... ROLLBACK: aviso crítico não lido sobrevive
 *     à retenção base, aviso lido não sobrevive, teto absoluto apaga tudo,
 *     silêncio vencido é recolhido e cada execução deixa registro.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/collab/collabRetention.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');
const TABLE = 'collab_notification_purge_runs';

// --- 1) RLS e privilégios ------------------------------------------------------
check(
  'RLS',
  query(`SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relname='${TABLE}'`) === 't',
  `${TABLE} sem row level security`,
);

const policies = query(`
  SELECT COALESCE(string_agg(policyname||':'||cmd||':'||roles::text||':'||COALESCE(qual,''), ',' ORDER BY policyname), '')
    FROM pg_policies WHERE schemaname='public' AND tablename='${TABLE}'`);
check('RLS', policies !== '', `${TABLE} com RLS ligada e nenhuma política`);
check('RLS', !/\banon\b|\{public\}/.test(policies), `${TABLE} exposta a anon/PUBLIC (${policies})`);
check('RLS', !/:(INSERT|UPDATE|DELETE|ALL):/.test(policies), `${TABLE} aceita escrita via API (${policies})`);
check('RLS', /has_role\(auth\.uid\(\), 'admin'/.test(policies), `${TABLE} não restringe a leitura a admin (${policies})`);

const grants = query(`
  SELECT COALESCE(string_agg(DISTINCT grantee::regrole::text||':'||privilege_type, ',' ORDER BY grantee::regrole::text||':'||privilege_type), '')
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a(grantor, grantee, privilege_type, is_grantable)
   WHERE n.nspname='public' AND c.relname='${TABLE}'`);
check('GRANT', !/(^|,)anon:/.test(grants), `${TABLE} concede privilégio a anon (${grants})`);
check('GRANT', !/(^|,)-:/.test(grants), `${TABLE} concede privilégio a PUBLIC (${grants})`);
for (const priv of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
  check('GRANT', !grants.includes(`authenticated:${priv}`), `${TABLE} concede ${priv} a authenticated (${grants})`);
}

const execExposure = query(`
  SELECT COALESCE(string_agg(DISTINCT p.proname||':'||grantee::regrole::text, ',' ORDER BY p.proname||':'||grantee::regrole::text), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a(grantor, grantee, privilege_type, is_grantable)
   WHERE n.nspname='public' AND p.proname='collab_purge_notifications'
     AND grantee::regrole::text IN ('anon','authenticated','-')`);
check('EXECUTE', execExposure === '', `expurgo alcançável pela API (${execExposure}) — é rotina de cron`);

// --- 2) Paridade SQL ↔ TypeScript ---------------------------------------------
const sqlPolicy = JSON.parse(query('SELECT public.collab_retention_policy()'));
for (const key of Object.keys(sqlPolicy)) {
  const ts = Number(new RegExp(`${key}:\\s*(\\d+)`).exec(source)?.[1]);
  check('PARIDADE', sqlPolicy[key] === ts, `${key} SQL=${sqlPolicy[key]} TS=${ts}`);
}
check(
  'PARIDADE',
  sqlPolicy.hardCeilingDays >= Math.max(sqlPolicy.actionableGraceDays, sqlPolicy.criticalGraceDays, sqlPolicy.attentionGraceDays, sqlPolicy.baseDays),
  'teto absoluto menor que alguma carência — a carência nunca seria aplicada',
);

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
const expected = (kind, hasRead) => {
  if (hasRead) return sqlPolicy.baseDays;
  if (kind === 'invite_received') return sqlPolicy.actionableGraceDays;
  if (kind === 'membership_removed') return sqlPolicy.criticalGraceDays;
  if (kind === 'membership_suspended') return sqlPolicy.attentionGraceDays;
  return sqlPolicy.baseDays;
};
for (const kind of KINDS) {
  for (const hasRead of [true, false]) {
    const got = Number(query(`SELECT public.collab_effective_retention_days('${kind}', ${hasRead})`));
    const want = Math.min(expected(kind, hasRead), sqlPolicy.hardCeilingDays);
    check('PARIDADE', got === want, `carência de ${kind} (lido=${hasRead}) SQL=${got} esperado=${want}`);
  }
}

// --- 3) Bateria funcional (BEGIN ... ROLLBACK) --------------------------------
const functional = `
BEGIN;
DO $gate$
DECLARE
  v_user uuid := gen_random_uuid();
  v_org uuid;
  v_net uuid;
  v_now timestamptz := now();
  v_critical uuid := gen_random_uuid();
  v_read uuid := gen_random_uuid();
  v_ancient uuid := gen_random_uuid();
  v_result jsonb;
BEGIN
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('gate-132', 'gate-132-' || gen_random_uuid()::text, v_user) RETURNING id INTO v_org;
  INSERT INTO public.collab_networks (name, slug, owner_org_id)
  VALUES ('gate-132', 'g132-' || substr(md5(random()::text), 1, 10), v_org) RETURNING id INTO v_net;

  -- (a) crítico NÃO lido com 120 dias: passa da base (90) mas está na carência (365).
  INSERT INTO public.collab_notifications (id, network_id, organization_id, kind, severity, dedup_key, created_at)
  VALUES (v_critical, v_net, v_org, 'membership_removed', 'critical', 'g132-crit-' || v_critical::text, v_now - interval '120 days');

  -- (b) informativo LIDO com 120 dias: já pode sair.
  INSERT INTO public.collab_notifications (id, network_id, organization_id, kind, severity, dedup_key, created_at)
  VALUES (v_read, v_net, v_org, 'invite_accepted', 'info', 'g132-read-' || v_read::text, v_now - interval '120 days');
  INSERT INTO public.collab_notification_reads (notification_id, user_id) VALUES (v_read, v_user);

  -- (c) crítico não lido com 400 dias: acima do teto absoluto.
  INSERT INTO public.collab_notifications (id, network_id, organization_id, kind, severity, dedup_key, created_at)
  VALUES (v_ancient, v_net, v_org, 'membership_removed', 'critical', 'g132-old-' || v_ancient::text, v_now - interval '400 days');

  -- (d) silêncio vencido há 60 dias e silêncio vencido ontem.
  INSERT INTO public.collab_notification_silences (user_id, organization_id, silenced_kinds, silenced_until)
  VALUES (v_user, v_org, ARRAY['invite_accepted'], v_now - interval '60 days');
  INSERT INTO public.collab_notification_silences (user_id, organization_id, silenced_kinds, silenced_until)
  VALUES (gen_random_uuid(), v_org, ARRAY['invite_accepted'], v_now - interval '1 day');

  v_result := public.collab_purge_notifications(v_now);

  IF NOT EXISTS (SELECT 1 FROM public.collab_notifications WHERE id = v_critical) THEN
    RAISE EXCEPTION 'gate:crítico não lido apagado dentro da carência';
  END IF;
  IF EXISTS (SELECT 1 FROM public.collab_notifications WHERE id = v_read) THEN
    RAISE EXCEPTION 'gate:aviso lido e vencido não foi apagado';
  END IF;
  IF EXISTS (SELECT 1 FROM public.collab_notifications WHERE id = v_ancient) THEN
    RAISE EXCEPTION 'gate:teto absoluto não aplicado';
  END IF;
  IF (SELECT count(*) FROM public.collab_notification_silences WHERE organization_id = v_org) <> 1 THEN
    RAISE EXCEPTION 'gate:limpeza de silêncios vencidos incorreta';
  END IF;
  IF (v_result ->> 'deletedNotifications')::int <> 2 THEN
    RAISE EXCEPTION 'gate:contagem devolvida incorreta (%)', v_result;
  END IF;
  IF (v_result ->> 'truncated')::boolean THEN
    RAISE EXCEPTION 'gate:lote marcado como truncado sem excesso';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.collab_notification_purge_runs
     WHERE executed_at = v_now AND deleted_notifications = 2 AND deleted_silences = 1
  ) THEN
    RAISE EXCEPTION 'gate:execução do expurgo não auditada';
  END IF;

  -- Idempotência: rodar de novo não apaga o que ainda está na carência.
  v_result := public.collab_purge_notifications(v_now);
  IF (v_result ->> 'deletedNotifications')::int <> 0 THEN
    RAISE EXCEPTION 'gate:segunda execução apagou avisos protegidos (%)', v_result;
  END IF;
END
$gate$;
ROLLBACK;
`;

try {
  execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-c', functional], { encoding: 'utf8' });
} catch (error) {
  const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  failures.push(`FUNCIONAL: ${out.split('\n').find((l) => l.includes('gate:')) ?? out.trim()}`);
}

if (failures.length > 0) {
  console.error('❌ Gate de retenção colaborativa (Onda 132) falhou:');
  for (const f of failures) console.error(`   • ${f}`);
  process.exit(1);
}
console.log('✅ Retenção colaborativa íntegra: carência por reconhecimento, teto absoluto e auditoria de expurgo.');
