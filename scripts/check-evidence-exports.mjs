#!/usr/bin/env node
/**
 * Gate de CI — Onda 157: persistência da exportação probatória.
 *
 * A Onda 156 selou a REGRA (`src/lib/evidence/custodyManifest.ts`). Esta onda
 * põe o manifesto no banco, e com isso aparece um risco novo: existirem DUAS
 * implementações do encadeamento — a de TypeScript, que gera, e a de SQL, que
 * confere. Se as duas divergirem por um único byte de canonicalização, o banco
 * recusa exportação legítima (paralisia) ou, pior, aceita como boa uma corrente
 * que a regra jamais produziria.
 *
 * Por isso a verificação central aqui não é "a migração aplicou": é **o mesmo
 * vetor passar pelos dois lados e produzir os mesmos 64 hexadecimais**. O vetor
 * é adversarial de propósito — aspas, contrabarra, caractere de controle,
 * acento e byteSize zero — porque é exatamente aí que canonicalização diverge.
 *
 * Ordem, do mais barato ao mais caro:
 *   1. Testes/simulação da regra pura (Onda 156 continua verde).
 *   2. Espelho TS↔SQL da corrente sobre vetor adversarial.
 *   3. Superfície fechada: `anon` sem privilégio, RLS ligada, sem policy de
 *      UPDATE/DELETE, `authenticated` sem privilégio de escrita destrutiva.
 *   4. Exercício em transação REVERTIDA: corrente adulterada é recusada,
 *      colunas de resumo são derivadas do manifesto (nunca do cliente) e a
 *      trilha é imutável.
 */
import { execFileSync } from 'node:child_process';

const failures = [];
const fail = (m) => failures.push(m);

/* -------- 1. a regra pura continua verde ----------------------------- */

try {
  execFileSync(
    'npx',
    [
      'vitest',
      'run',
      'src/lib/evidence/__tests__/custodyManifest.test.ts',
      'src/lib/evidence/__tests__/custodyManifest.simulation.test.ts',
    ],
    { encoding: 'utf8', stdio: 'pipe' }
  );
} catch (error) {
  fail(`testes da cadeia de custódia falharam:\n${(error.stdout ?? error.message).slice(-2000)}`);
}

/* -------- conexão ----------------------------------------------------- */

// O pooler às vezes derruba a primeira conexão. Isso é ruído de infraestrutura,
// não defeito do código sob teste: gate instável é gate que o time ignora.
const psql = (sql, attempts = 3) => {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      last = error;
      if (!/timed out|connection|server closed/i.test(String(error.stderr ?? ''))) throw error;
    }
  }
  throw last;
};

const hasPsql = (() => {
  try {
    psql('SELECT 1');
    return true;
  } catch {
    return false;
  }
})();

if (!hasPsql) {
  console.log('Onda 157 — psql indisponível: verificações de banco puladas (etapa 1 executada).');
} else {
  /* -------- 2. espelho TS↔SQL da corrente ----------------------------- */

  // Vetor adversarial: aspas, contrabarra, caractere de controle, acento,
  // deslocamento de relógio negativo e um segmento de tamanho zero.
  const SEGMENTS = [
    {
      index: 0,
      storagePath: 'cam/1/"aspas"\\barra\u001fctl/ó.mp4',
      byteSize: 1048576,
      sha256: 'a'.repeat(64),
      deviceStartUtc: '2026-07-27T10:00:00.000Z',
      deviceEndUtc: '2026-07-27T10:00:30.000Z',
      receivedAtUtc: '2026-07-27T10:00:31.000Z',
      clockOffsetMs: -1500,
    },
    {
      index: 1,
      storagePath: 'cam/1/b.mp4',
      byteSize: 0,
      sha256: 'b'.repeat(64),
      deviceStartUtc: '2026-07-27T10:00:30.000Z',
      deviceEndUtc: '2026-07-27T10:01:00.000Z',
      receivedAtUtc: '2026-07-27T10:01:01.000Z',
      clockOffsetMs: 0,
    },
  ];

  // A regra vive em TypeScript; `jiti` a carrega sem passo de build, para o
  // gate comparar exatamente o mesmo código que a aplicação executa.
  const { createJiti } = await import('jiti');
  const { buildCustodyChain } = await createJiti(import.meta.url).import(
    '../src/lib/evidence/custodyManifest.ts'
  );
  const expected = await buildCustodyChain(SEGMENTS);

  const literal = (value) => `$vec$${JSON.stringify(value)}$vec$::jsonb`;
  const actual = psql(
    `SELECT coalesce(array_to_string(public.evidence_chain(${literal(SEGMENTS)}), ','), '')`
  );

  if (actual !== expected.join(',')) {
    fail(
      'a corrente do banco divergiu da regra em TypeScript — canonicalização fora de sincronia\n' +
        `  TS  : ${expected.join(',')}\n  SQL : ${actual}`
    );
  }

  /* -------- 3. superfície fechada -------------------------------------- */

  const anonGrants = psql(
    `SELECT count(*) FROM information_schema.role_table_grants
      WHERE table_schema='public' AND table_name='evidence_exports' AND grantee='anon'`
  );
  if (anonGrants !== '0') fail(`evidence_exports: anon ainda possui ${anonGrants} privilégio(s)`);

  const writeGrants = psql(
    `SELECT coalesce(string_agg(privilege_type, ','), '') FROM information_schema.role_table_grants
      WHERE table_schema='public' AND table_name='evidence_exports'
        AND grantee='authenticated' AND privilege_type IN ('UPDATE','DELETE','TRUNCATE')`
  );
  if (writeGrants !== '') {
    fail(
      `evidence_exports: authenticated ainda pode ${writeGrants} — manifesto selado é definitivo`
    );
  }

  if (
    psql(`SELECT relrowsecurity FROM pg_class WHERE oid='public.evidence_exports'::regclass`) !==
    't'
  ) {
    fail('evidence_exports: RLS não está habilitada');
  }

  const mutatingPolicies = psql(
    `SELECT coalesce(string_agg(polname, ','), '') FROM pg_policy
      WHERE polrelid='public.evidence_exports'::regclass AND polcmd IN ('w','d','*')`
  );
  if (mutatingPolicies !== '') {
    fail(`evidence_exports: existe policy de alteração/remoção (${mutatingPolicies})`);
  }

  for (const fn of [
    'evidence_chain',
    'evidence_canonical_segment',
    'evidence_exports_seal',
    'block_evidence_export_mutation',
  ]) {
    const def = psql(
      `SELECT coalesce(pg_get_functiondef(p.oid), '') FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname='public' AND p.proname='${fn}' LIMIT 1`
    );
    if (def === '') fail(`${fn}: rotina ausente no banco`);
    else if (!/SET search_path/i.test(def)) fail(`${fn}: sem search_path fixo`);
  }

  /* -------- 4. exercício em transação revertida ------------------------ */

  const chain = expected;
  const manifest = (over = {}) => ({
    version: 1,
    exportId: 'gate-157',
    rootHash: 'c'.repeat(64),
    requestedBy: '00000000-0000-4000-8000-000000000157',
    segments: SEGMENTS,
    chain,
    assessment: { level: 'weakened', coverageRatio: 0.812345678, gaps: [{ index: 0 }] },
    ...over,
  });

  // O INSERT declara de propósito "admissible", cobertura 1 e zero lacunas: se
  // o banco confiasse no cliente, a listagem diria "prova íntegra" enquanto o
  // documento diz "enfraquecida". A linha tem que sair do manifesto.
  const insert = (m, exportId) =>
    `INSERT INTO public.evidence_exports
       (user_id, camera_id, export_id, root_hash, verdict, coverage_ratio, segment_count, gap_count, manifest)
     VALUES ('00000000-0000-4000-8000-000000000157', '00000000-0000-4000-8000-0000000c0157',
             '${exportId}', '${'f'.repeat(64)}', 'admissible', 1, 0, 0, ${literal(m)});`;

  const tampered = [...chain];
  tampered[1] = '0'.repeat(64);

  const sql = `
BEGIN;
  ${insert(manifest(), 'gate-157-a')}

  DO $gate$
  DECLARE r public.evidence_exports%ROWTYPE; blocked boolean;
  BEGIN
    SELECT * INTO r FROM public.evidence_exports WHERE export_id = 'gate-157';
    IF r.export_id IS NULL THEN
      RAISE EXCEPTION 'export_id não foi derivado do manifesto';
    END IF;
    IF r.verdict <> 'weakened' THEN
      RAISE EXCEPTION 'veredito veio do cliente (%) em vez do manifesto', r.verdict;
    END IF;
    IF r.coverage_ratio <> 0.812346 THEN
      RAISE EXCEPTION 'cobertura veio do cliente (%)', r.coverage_ratio;
    END IF;
    IF r.segment_count <> 2 OR r.gap_count <> 1 THEN
      RAISE EXCEPTION 'contagens vieram do cliente (% segmentos, % lacunas)', r.segment_count, r.gap_count;
    END IF;

    blocked := false;
    BEGIN
      UPDATE public.evidence_exports SET verdict = 'admissible' WHERE export_id = 'gate-157';
    EXCEPTION WHEN others THEN blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'manifesto selado aceitou alteração'; END IF;

    blocked := false;
    BEGIN
      DELETE FROM public.evidence_exports WHERE export_id = 'gate-157';
    EXCEPTION WHEN others THEN blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'manifesto selado aceitou remoção'; END IF;
  END $gate$;

  -- Corrente adulterada: o banco recalcula e recusa.
  DO $gate$
  DECLARE blocked boolean := false;
  BEGIN
    BEGIN
      ${insert(manifest({ chain: tampered, exportId: 'gate-157-t' }), 'gate-157-t')}
    EXCEPTION WHEN others THEN blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'corrente adulterada foi selada'; END IF;
  END $gate$;
ROLLBACK;`;

  try {
    execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    fail(`exercício da selagem falhou:\n${String(error.stderr ?? error.message).slice(-2000)}`);
  }
}

if (failures.length > 0) {
  console.error('Onda 157 — persistência probatória REPROVADA:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Onda 157 — persistência probatória OK.');
