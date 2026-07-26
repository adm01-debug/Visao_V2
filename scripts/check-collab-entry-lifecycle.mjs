#!/usr/bin/env node
/**
 * Gate de CI — Onda 133: ciclo de vida das entradas compartilhadas.
 *
 * Verifica no banco real:
 *  1. Privilégios/RLS de `collab_entry_purge_runs` e inalcançabilidade do expurgo pela API.
 *  2. Preservação da prova: `collab_matches.entry_id` NÃO pode ser ON DELETE CASCADE
 *     e a cópia mínima (owner_org_id/plate_hash) precisa existir com gatilho.
 *  3. Paridade literal SQL ↔ TypeScript da política.
 *  4. Bateria funcional em BEGIN ... ROLLBACK: carência respeitada, entrada
 *     vencida/revogada apagada, avistamento sobrevivendo à entrada, auditoria
 *     e idempotência.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/collab/collabEntryLifecycle.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');
const TABLE = 'collab_entry_purge_runs';

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
  SELECT COALESCE(string_agg(DISTINCT p.proname||':'||grantee::regrole::text, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a(grantor, grantee, privilege_type, is_grantable)
   WHERE n.nspname='public' AND p.proname='collab_purge_entries'
     AND grantee::regrole::text IN ('anon','authenticated','-')`);
check('EXECUTE', execExposure === '', `expurgo alcançável pela API (${execExposure}) — é rotina de cron`);

// --- 2) Preservação da prova ---------------------------------------------------
const fkAction = query(`
  SELECT confdeltype FROM pg_constraint
   WHERE conrelid='public.collab_matches'::regclass AND conname='collab_matches_entry_id_fkey'`);
check('PROVA', fkAction === 'n', `collab_matches.entry_id com ON DELETE '${fkAction}' — deve ser SET NULL ('n')`);

const snapshotCols = query(`
  SELECT COALESCE(string_agg(attname, ',' ORDER BY attname), '')
    FROM pg_attribute
   WHERE attrelid='public.collab_matches'::regclass AND NOT attisdropped
     AND attname IN ('owner_org_id','plate_hash','entry_reason')`);
check('PROVA', snapshotCols === 'entry_reason,owner_org_id,plate_hash', `cópia mínima incompleta (${snapshotCols})`);

const snapshotTrigger = query(`
  SELECT COALESCE(string_agg(tgname, ','), '') FROM pg_trigger
   WHERE tgrelid='public.collab_matches'::regclass AND NOT tgisinternal
     AND tgname='trg_collab_matches_snapshot'`);
check('PROVA', snapshotTrigger === 'trg_collab_matches_snapshot', 'gatilho de cópia mínima ausente');

const matchPolicy = query(`
  SELECT COALESCE(string_agg(qual, ' '), '') FROM pg_policies
   WHERE schemaname='public' AND tablename='collab_matches'`);
check('PROVA', /owner_org_id/.test(matchPolicy), 'RLS de collab_matches ainda depende da entrada viva');

// --- 3) Paridade SQL ↔ TypeScript ---------------------------------------------
const sqlPolicy = JSON.parse(query('SELECT public.collab_entry_lifecycle_policy()'));
for (const key of Object.keys(sqlPolicy)) {
  const ts = Number(new RegExp(`${key}:\\s*(\\d+)`).exec(source)?.[1]);
  check('PARIDADE', sqlPolicy[key] === ts, `${key} SQL=${sqlPolicy[key]} TS=${ts}`);
}
check('PARIDADE', sqlPolicy.maxDeletePerRun > 0, 'teto de lote não positivo — expurgo nunca converge');

const cron = query(`SELECT COALESCE(string_agg(schedule, ','), '') FROM cron.job WHERE jobname='collab-purge-entries'`);
check('CRON', cron !== '', 'expurgo de entradas não agendado');

// --- 4) Bateria funcional (BEGIN ... ROLLBACK) --------------------------------
const functional = `
BEGIN;
DO $gate$
DECLARE
  v_user uuid := gen_random_uuid();
  v_owner uuid;
  v_reader uuid;
  v_net uuid;
  v_now timestamptz := now();
  v_fresh uuid; v_revoked uuid; v_expired uuid; v_grace uuid;
  v_match_old uuid := gen_random_uuid();
  v_match_new uuid := gen_random_uuid();
  v_result jsonb;
BEGIN
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('gate-133-owner', 'gate-133-o-' || gen_random_uuid()::text, v_user) RETURNING id INTO v_owner;
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('gate-133-reader', 'gate-133-r-' || gen_random_uuid()::text, v_user) RETURNING id INTO v_reader;
  INSERT INTO public.collab_networks (name, slug, owner_org_id)
  VALUES ('gate-133', 'g133-' || substr(md5(random()::text), 1, 10), v_owner) RETURNING id INTO v_net;

  -- (a) entrada viva
  INSERT INTO public.collab_entries (network_id, owner_org_id, plate_hash, severity, reason, expires_at)
  VALUES (v_net, v_owner, decode(md5('a'), 'hex'), 3, 'viva', v_now + interval '10 days') RETURNING id INTO v_fresh;
  -- (b) revogada há 40 dias (> carência 30)
  INSERT INTO public.collab_entries (network_id, owner_org_id, plate_hash, severity, reason, expires_at, revoked_at)
  VALUES (v_net, v_owner, decode(md5('b'), 'hex'), 3, 'revogada', v_now + interval '10 days', v_now - interval '40 days') RETURNING id INTO v_revoked;
  -- (c) vencida há 40 dias
  INSERT INTO public.collab_entries (network_id, owner_org_id, plate_hash, severity, reason, expires_at)
  VALUES (v_net, v_owner, decode(md5('c'), 'hex'), 3, 'vencida', v_now - interval '40 days') RETURNING id INTO v_expired;
  -- (d) revogada ontem: dentro da carência
  INSERT INTO public.collab_entries (network_id, owner_org_id, plate_hash, severity, reason, expires_at, revoked_at)
  VALUES (v_net, v_owner, decode(md5('d'), 'hex'), 3, 'recente', v_now + interval '10 days', v_now - interval '1 day') RETURNING id INTO v_grace;

  -- avistamentos: um antigo (>180d) e um recente apontando para a entrada vencida
  INSERT INTO public.collab_matches (id, network_id, entry_id, reader_org_id, severity, confidence, matched_at)
  VALUES (v_match_old, v_net, v_fresh, v_reader, 3, 0.9, v_now - interval '200 days');
  INSERT INTO public.collab_matches (id, network_id, entry_id, reader_org_id, severity, confidence, matched_at)
  VALUES (v_match_new, v_net, v_expired, v_reader, 3, 0.9, v_now - interval '2 days');

  IF (SELECT owner_org_id FROM public.collab_matches WHERE id = v_match_new) IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION 'gate:cópia mínima não foi congelada no avistamento';
  END IF;

  -- imutabilidade da prova
  UPDATE public.collab_matches SET owner_org_id = v_reader, entry_reason = 'adulterado' WHERE id = v_match_new;
  IF (SELECT owner_org_id FROM public.collab_matches WHERE id = v_match_new) IS DISTINCT FROM v_owner
     OR (SELECT entry_reason FROM public.collab_matches WHERE id = v_match_new) <> 'vencida' THEN
    RAISE EXCEPTION 'gate:cópia mínima do avistamento é reescrevível';
  END IF;

  v_result := public.collab_purge_entries(v_now);

  IF EXISTS (SELECT 1 FROM public.collab_matches WHERE id = v_match_old) THEN
    RAISE EXCEPTION 'gate:avistamento além da retenção não foi apagado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.collab_matches WHERE id = v_match_new) THEN
    RAISE EXCEPTION 'gate:avistamento recente foi destruído junto com a entrada';
  END IF;
  IF (SELECT entry_id FROM public.collab_matches WHERE id = v_match_new) IS NOT NULL THEN
    RAISE EXCEPTION 'gate:entrada vencida não foi desligada do avistamento';
  END IF;
  IF (SELECT owner_org_id FROM public.collab_matches WHERE id = v_match_new) IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION 'gate:prova perdeu a organização dona após o expurgo';
  END IF;
  IF EXISTS (SELECT 1 FROM public.collab_entries WHERE id IN (v_revoked, v_expired)) THEN
    RAISE EXCEPTION 'gate:entrada elegível sobreviveu ao expurgo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.collab_entries WHERE id = v_grace) THEN
    RAISE EXCEPTION 'gate:entrada dentro da carência foi apagada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.collab_entries WHERE id = v_fresh) THEN
    RAISE EXCEPTION 'gate:entrada viva foi apagada';
  END IF;
  IF (v_result ->> 'deletedEntries')::int <> 2 OR (v_result ->> 'deletedMatches')::int <> 1 THEN
    RAISE EXCEPTION 'gate:contagem devolvida incorreta (%)', v_result;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.collab_entry_purge_runs
     WHERE executed_at = v_now AND deleted_entries = 2 AND deleted_matches = 1
  ) THEN
    RAISE EXCEPTION 'gate:execução do expurgo não auditada';
  END IF;

  v_result := public.collab_purge_entries(v_now);
  IF (v_result ->> 'deletedEntries')::int <> 0 OR (v_result ->> 'deletedMatches')::int <> 0 THEN
    RAISE EXCEPTION 'gate:segunda execução apagou dado protegido (%)', v_result;
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
  console.error('❌ Gate de ciclo de vida colaborativo (Onda 133) falhou:');
  for (const f of failures) console.error(`   • ${f}`);
  process.exit(1);
}
console.log('✅ Ciclo de vida colaborativo íntegro: entrada expira de fato, prova do leitor sobrevive.');
