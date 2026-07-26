#!/usr/bin/env node
/**
 * Gate de CI — Onda 127: rede colaborativa de placas entre organizações.
 *
 * Verifica no banco real:
 *  1. RLS ligada nas 5 tabelas; `collab_network_secrets` fechada por construção
 *     (RLS ligada e ZERO políticas) e sem qualquer privilégio de aplicação.
 *  2. Privilégios exatos: nada para anon/PUBLIC; apenas SELECT para authenticated
 *     (escrita só por rotinas SECURITY DEFINER).
 *  3. Paridade literal entre `collab_policy()` e COLLAB_POLICY do TypeScript.
 *  4. Paridade da canonicalização: `canonical_plate()` e `canonicalPlate()` devem
 *     concordar caractere a caractere em um corpus adversarial.
 *  5. Rotinas DEFINER com search_path fixo.
 *  6. Bateria funcional em BEGIN ... ROLLBACK: compartilhar, casar, ignorar a
 *     própria entrada, revogar, expirar, cooldown, reciprocidade e desempate.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

const LIB = new URL('../src/lib/collab/collabNetwork.ts', import.meta.url);
const source = readFileSync(LIB, 'utf8');
const TABLES = [
  'collab_networks',
  'collab_network_secrets',
  'collab_memberships',
  'collab_entries',
  'collab_matches',
];

// --- 1) RLS -------------------------------------------------------------------
for (const table of TABLES) {
  const rls = query(`
    SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname='${table}'`);
  check('RLS', rls === 't', `${table} sem row level security`);
}

const secretPolicies = query(`
  SELECT count(*) FROM pg_policies
   WHERE schemaname='public' AND tablename='collab_network_secrets'`);
check(
  'RLS',
  secretPolicies === '0',
  `collab_network_secrets tem ${secretPolicies} política(s): a chave HMAC deve ser inalcançável pela API`,
);

for (const table of ['collab_networks', 'collab_memberships', 'collab_entries', 'collab_matches']) {
  const policies = query(`
    SELECT COALESCE(string_agg(policyname||':'||cmd||':'||roles::text, ',' ORDER BY policyname), '')
      FROM pg_policies WHERE schemaname='public' AND tablename='${table}'`);
  check('RLS', policies !== '', `${table} com RLS ligada e nenhuma política de leitura`);
  check('RLS', !/\banon\b|\{public\}/.test(policies), `${table} exposta a anon/PUBLIC (${policies})`);
  check(
    'RLS',
    !/:(INSERT|UPDATE|DELETE|ALL):/.test(policies),
    `${table} aceita escrita direta; a escrita deve passar por rotina DEFINER (${policies})`,
  );
}

const entriesPolicy = query(`
  SELECT qual FROM pg_policies
   WHERE schemaname='public' AND tablename='collab_entries' AND policyname='collab_entries_select_own'`);
check(
  'PRIVACIDADE',
  /owner_org_id/.test(entriesPolicy),
  'collab_entries deve limitar a leitura à própria organização: expor o hash alheio permite força bruta',
);

// --- 2) Privilégios ------------------------------------------------------------
for (const table of TABLES) {
  const anonPriv = query(`
    SELECT count(*) FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid='public.${table}'::regclass
       AND a.grantee::regrole::text IN ('anon','public')`);
  check('GRANT', anonPriv === '0', `anon/PUBLIC tem ${anonPriv} privilégio(s) em ${table}`);

  const authPriv = query(`
    SELECT COALESCE(string_agg(DISTINCT a.privilege_type, ',' ORDER BY a.privilege_type), '')
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid='public.${table}'::regclass AND a.grantee::regrole::text='authenticated'`);
  const expected = table === 'collab_network_secrets' ? '' : 'SELECT';
  check(
    'GRANT',
    authPriv === expected,
    `${table}: authenticated deveria ter "${expected}" e tem "${authPriv}"`,
  );
}

const hashExec = query(`
  SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ',' ORDER BY a.grantee::regrole::text), '')
    FROM pg_proc p, aclexplode(p.proacl) a
   WHERE p.pronamespace='public'::regnamespace AND p.proname='collab_plate_hash'`);
check(
  'GRANT',
  !/\banon\b|\bauthenticated\b|\bpublic\b/.test(hashExec),
  `collab_plate_hash executável por ${hashExec}: permitiria oráculo de hash sobre placas arbitrárias`,
);

const matchExec = query(`
  SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ',' ORDER BY a.grantee::regrole::text), '')
    FROM pg_proc p, aclexplode(p.proacl) a
   WHERE p.pronamespace='public'::regnamespace AND p.proname='match_collab_plate'`);
check(
  'GRANT',
  !/\banon\b|\bauthenticated\b|\bpublic\b/.test(matchExec),
  `match_collab_plate executável por ${matchExec}: só o pipeline (service_role) confere leituras`,
);

// --- 3) Paridade da política ----------------------------------------------------
const dbPolicy = JSON.parse(query(`SELECT public.collab_policy()::text`));
const pick = (name) =>
  Number(source.match(new RegExp(`${name}:\\s*([\\d_.]+)`))?.[1]?.replace(/_/g, ''));
const tsPolicy = {
  defaultTtlDays: pick('defaultTtlDays'),
  maxTtlDays: pick('maxTtlDays'),
  minSeverity: pick('minSeverity'),
  maxSeverity: pick('maxSeverity'),
  matchCooldownSeconds: pick('matchCooldownSeconds'),
  maxActiveEntriesPerOrg: pick('maxActiveEntriesPerOrg'),
  minConfidence: pick('minConfidence'),
  plateLength: pick('plateLength'),
};
for (const [key, value] of Object.entries(tsPolicy)) {
  check(
    'POLÍTICA',
    Number.isFinite(value) && Number(dbPolicy[key]) === value,
    `${key}: TypeScript=${value} vs SQL=${dbPolicy[key]}`,
  );
}

// --- 4) Paridade da canonicalização --------------------------------------------
const { canonicalPlate } = await import(pathToFileURL(new URL(LIB).pathname).href).catch(
  async () => {
    // O gate roda em Node puro; transpila o módulo TS na marra removendo os tipos
    // seria frágil. Em vez disso usamos o build de teste via tsx quando presente.
    return { canonicalPlate: null };
  },
);

const corpus = [
  'ABC1D23', 'abc-1d23', ' ABC1234 ', '4BC1234', 'ABCI234', 'ABC1D2S', 'ABC1023',
  'OOO0000', 'QQQ1L23', 'ZZZ9Z99', 'B8B1888', 'GGG6G66', 'DDD0D00', 'SSS5S55',
  'ABC123', 'ABC12345', '', '   ', '#$%^&*!', '7BC1234', 'ABCX234', 'A.B.C.1.2.3.4',
  'iii1i11', 'lll1l11', '000O000', 'ABC1D2Q', 'ABC-1D-23',
];

if (typeof canonicalPlate === 'function') {
  for (const raw of corpus) {
    const sqlValue = query(
      `SELECT COALESCE(public.canonical_plate(${literal(raw)}), '<null>')`,
    );
    const tsResult = canonicalPlate(raw);
    const tsValue = tsResult.ok ? tsResult.plate : '<null>';
    check('CANÔNICA', sqlValue === tsValue, `"${raw}" → SQL=${sqlValue} vs TS=${tsValue}`);
  }
} else {
  // Sem loader de TS: reimplementamos a máscara aqui seria duplicar a regra uma
  // terceira vez. Preferimos falhar alto a validar de mentira.
  failures.push(
    'CANÔNICA: não consegui importar canonicalPlate de collabNetwork.ts (rode via tsx/vitest)',
  );
}

function literal(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

// --- 5) search_path das rotinas -------------------------------------------------
const definers = query(`
  SELECT string_agg(p.proname || '=' || COALESCE(array_to_string(p.proconfig, '|'), 'SEM'), ',' ORDER BY p.proname)
    FROM pg_proc p
   WHERE p.pronamespace='public'::regnamespace
     AND p.prosecdef
     AND p.proname IN ('collab_plate_hash','collab_member_status','collab_user_orgs',
                       'share_collab_plate','revoke_collab_entry','match_collab_plate',
                       'collab_network_bootstrap')`);
check('DEFINER', !/=SEM/.test(definers), `rotina DEFINER sem search_path fixo (${definers})`);
check(
  'DEFINER',
  (definers.match(/search_path/g) ?? []).length === 7,
  `esperava 7 rotinas DEFINER com search_path, encontrei: ${definers}`,
);

// --- 6) Bateria funcional em transação revertida ---------------------------------
const functional = `
BEGIN;
SET LOCAL client_min_messages = warning;
DO $gate$
DECLARE
  org_a uuid; org_b uuid; org_c uuid; net uuid; usr uuid := gen_random_uuid();
  r record; e1 uuid; e2 uuid; t0 timestamptz := now();
BEGIN
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('Gate A', 'gate-a-' || substr(gen_random_uuid()::text,1,8), usr) RETURNING id INTO org_a;
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('Gate B', 'gate-b-' || substr(gen_random_uuid()::text,1,8), usr) RETURNING id INTO org_b;
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('Gate C', 'gate-c-' || substr(gen_random_uuid()::text,1,8), usr) RETURNING id INTO org_c;

  INSERT INTO public.collab_networks (name, slug, owner_org_id, reciprocity_required)
  VALUES ('Gate Net', 'gate-net-' || substr(gen_random_uuid()::text,1,8), org_a, true)
  RETURNING id INTO net;

  -- A rede nasce com chave e com a dona já ativa.
  IF NOT EXISTS (SELECT 1 FROM public.collab_network_secrets WHERE network_id = net) THEN
    RAISE EXCEPTION 'FALHA: rede criada sem chave HMAC';
  END IF;
  IF public.collab_member_status(net, org_a) IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'FALHA: organização dona não entrou como ativa';
  END IF;

  -- Não-membro não compartilha.
  SELECT * INTO r FROM public.share_collab_plate(net, org_b, 'ABC1D23', 4, 'furto');
  IF r.accepted OR r.rejection <> 'member_not_active' THEN
    RAISE EXCEPTION 'FALHA: não-membro compartilhou (%)', r.rejection;
  END IF;

  INSERT INTO public.collab_memberships (network_id, organization_id, status, shares_data)
  VALUES (net, org_b, 'active', true), (net, org_c, 'active', false);

  -- Placa inválida é recusada antes de qualquer efeito.
  SELECT * INTO r FROM public.share_collab_plate(net, org_a, 'XX', 4, 'furto');
  IF r.accepted OR r.rejection <> 'invalid_plate' THEN
    RAISE EXCEPTION 'FALHA: placa inválida aceita (%)', r.rejection;
  END IF;

  -- Severidade e TTL fora da faixa.
  SELECT * INTO r FROM public.share_collab_plate(net, org_a, 'ABC1D23', 9, 'furto');
  IF r.rejection <> 'severity_out_of_range' THEN
    RAISE EXCEPTION 'FALHA: severidade 9 aceita (%)', r.rejection;
  END IF;
  SELECT * INTO r FROM public.share_collab_plate(net, org_a, 'ABC1D23', 4, 'furto', 999);
  IF r.rejection <> 'ttl_out_of_range' THEN
    RAISE EXCEPTION 'FALHA: TTL 999 aceito (%)', r.rejection;
  END IF;

  -- Compartilhamento válido.
  SELECT * INTO r FROM public.share_collab_plate(net, org_a, 'abc-1d23', 3, 'furto');
  IF NOT r.accepted THEN RAISE EXCEPTION 'FALHA: compartilhamento válido recusado (%)', r.rejection; END IF;
  e1 := r.entry_id;

  -- Idempotência: mesma placa da mesma org atualiza, não duplica.
  SELECT * INTO r FROM public.share_collab_plate(net, org_a, 'ABC1D23', 5, 'roubo');
  IF NOT r.accepted OR r.entry_id <> e1 THEN
    RAISE EXCEPTION 'FALHA: releitura duplicou a entrada';
  END IF;
  IF (SELECT count(*) FROM public.collab_entries WHERE network_id = net AND revoked_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'FALHA: mais de uma entrada viva para a mesma placa';
  END IF;

  -- A dona não é alertada pela própria entrada.
  SELECT * INTO r FROM public.match_collab_plate(net, org_a, 'ABC1D23', 0.9);
  IF r.alerted OR r.rejection <> 'own_entry' THEN
    RAISE EXCEPTION 'FALHA: organização alertada pela própria entrada (%)', r.rejection;
  END IF;

  -- Reciprocidade: org_c não compartilha, logo não recebe.
  SELECT * INTO r FROM public.match_collab_plate(net, org_c, 'ABC1D23', 0.9);
  IF r.alerted OR r.rejection <> 'reciprocity_required' THEN
    RAISE EXCEPTION 'FALHA: caroneiro recebeu alerta (%)', r.rejection;
  END IF;

  -- Confiança baixa nem consulta.
  SELECT * INTO r FROM public.match_collab_plate(net, org_b, 'ABC1D23', 0.5);
  IF r.alerted OR r.rejection <> 'low_confidence' THEN
    RAISE EXCEPTION 'FALHA: OCR fraco gerou alerta (%)', r.rejection;
  END IF;

  -- Casamento legítimo, inclusive com placa suja de OCR.
  SELECT * INTO r FROM public.match_collab_plate(net, org_b, ' abc 1d23 ', 0.91, NULL, t0);
  IF NOT r.alerted OR r.entry_id <> e1 OR r.severity <> 5 THEN
    RAISE EXCEPTION 'FALHA: casamento legítimo não alertou (%)', r.rejection;
  END IF;

  -- Cooldown de 15 minutos.
  SELECT * INTO r FROM public.match_collab_plate(net, org_b, 'ABC1D23', 0.91, NULL, t0 + interval '14 minutes');
  IF r.alerted OR r.rejection <> 'cooldown' THEN
    RAISE EXCEPTION 'FALHA: alerta repetido dentro do cooldown (%)', r.rejection;
  END IF;
  SELECT * INTO r FROM public.match_collab_plate(net, org_b, 'ABC1D23', 0.91, NULL, t0 + interval '16 minutes');
  IF NOT r.alerted THEN
    RAISE EXCEPTION 'FALHA: cooldown não liberou após a janela (%)', r.rejection;
  END IF;

  -- Desempate: entrada mais severa de outra org vence.
  SELECT * INTO r FROM public.share_collab_plate(net, org_c, 'ABC1D23', 2, 'suspeita');
  e2 := r.entry_id;
  UPDATE public.collab_entries SET severity = 5 WHERE id = e2;
  UPDATE public.collab_entries SET severity = 3 WHERE id = e1;
  SELECT * INTO r FROM public.match_collab_plate(net, org_b, 'ABC1D23', 0.91, NULL, t0 + interval '2 hours');
  IF NOT r.alerted OR r.entry_id <> e2 THEN
    RAISE EXCEPTION 'FALHA: desempate não escolheu a entrada mais severa';
  END IF;

  -- Expiração e revogação removem a entrada do jogo.
  UPDATE public.collab_entries SET expires_at = t0 - interval '1 day' WHERE id = e2;
  PERFORM public.revoke_collab_entry(e1, org_a);
  SELECT * INTO r FROM public.match_collab_plate(net, org_b, 'ABC1D23', 0.91, NULL, t0 + interval '3 hours');
  IF r.alerted OR r.rejection NOT IN ('entry_expired','entry_revoked') THEN
    RAISE EXCEPTION 'FALHA: entrada morta ainda alerta (%)', r.rejection;
  END IF;

  -- Revogação alheia não funciona.
  IF public.revoke_collab_entry(e2, org_b) THEN
    RAISE EXCEPTION 'FALHA: organização revogou entrada de terceiro';
  END IF;

  -- Membro suspenso perde os dois lados.
  UPDATE public.collab_memberships SET status = 'suspended'
   WHERE network_id = net AND organization_id = org_b;
  SELECT * INTO r FROM public.match_collab_plate(net, org_b, 'ABC1D23', 0.91);
  IF r.rejection <> 'member_not_active' THEN
    RAISE EXCEPTION 'FALHA: membro suspenso ainda consulta (%)', r.rejection;
  END IF;

  RAISE NOTICE 'GATE_OK';
END;
$gate$;
ROLLBACK;
`;

let functionalOut = '';
try {
  functionalOut = execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-c', functional], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  functionalOut = `${error.stdout ?? ''}${error.stderr ?? ''}`;
}
check('FUNCIONAL', /GATE_OK/.test(functionalOut), functionalOut.trim() || 'sem saída do psql');

// --- veredito -------------------------------------------------------------------
if (failures.length > 0) {
  console.error('\n✖ Gate da rede colaborativa (Onda 127) reprovado:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('✔ Rede colaborativa (Onda 127): RLS, privilégios, paridade e comportamento conferidos.');
