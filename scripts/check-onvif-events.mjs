#!/usr/bin/env node
/**
 * Gate de CI — Onda 155: eventos nativos ONVIF (PullPoint).
 *
 * Cinco verificações, da mais barata para a mais cara:
 *
 *  1. **Espelho byte a byte** das duas regras puras (`pullPointLease` e
 *     `onvifPullPointParse`) entre `src/` e `supabase/functions/_shared/`. A
 *     decisão do ciclo de vida é simulada no CI a partir da cópia do `src/`;
 *     se a borda executar outra cópia, a simulação vira teatro.
 *  2. **Testes e simulação** do ciclo de vida e do leitor de XML (Vitest).
 *  3. **A função de borda não decide nada**: nenhuma constante de prazo ou
 *     limiar de renovação pode reaparecer no transporte. Política duplicada no
 *     transporte é como a regra volta a divergir sem ninguém notar.
 *  4. **Superfície fechada**: `anon` sem privilégio nas tabelas novas e nas
 *     rotinas internas.
 *  5. **Exercício do banco em transação REVERTIDA**: a trilha de eventos é de
 *     fato imutável e `record_onvif_event` é idempotente sob reentrega.
 *
 * Por que (5): migração aplicar sem erro não prova que a deduplicação funciona.
 * Dedup quebrada, com a Onda 154 no laço, vira relé acionado em rajada.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const failures = [];
const fail = (m) => failures.push(m);
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

/* -------- 1. espelhos das regras puras ------------------------------- */

const MIRRORS = [
  ['src/lib/devices/pullPointLease.ts', 'supabase/functions/_shared/pullPointLease.ts', true],
  // O parser só difere pela extensão do import exigida pelo Deno.
  ['src/lib/devices/onvifPullPointParse.ts', 'supabase/functions/_shared/onvifPullPointParse.ts', false],
];

for (const [src, edge, exact] of MIRRORS) {
  try {
    if (exact) {
      if (sha(src) !== sha(edge)) fail(`${edge} divergiu de ${src} (espelho byte a byte)`);
    } else {
      const a = readFileSync(src, 'utf8');
      const b = readFileSync(edge, 'utf8').replace("./pullPointLease.ts", "./pullPointLease");
      if (a !== b) fail(`${edge} divergiu de ${src} (ignorando a extensão do import)`);
    }
  } catch (error) {
    fail(`não foi possível comparar ${src} com ${edge}: ${error.message}`);
  }
}

/* -------- 2. testes e simulação -------------------------------------- */

try {
  execFileSync(
    'npx',
    [
      'vitest',
      'run',
      'src/lib/devices/__tests__/pullPointLease.test.ts',
      'src/lib/devices/__tests__/pullPointLease.simulation.test.ts',
      'src/lib/devices/__tests__/onvifPullPointParse.test.ts',
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
} catch (error) {
  fail(`simulação/testes da Onda 155 falharam:\n${(error.stdout ?? error.message).slice(-2000)}`);
}

/* -------- 3. o transporte não pode decidir --------------------------- */

const edgeFn = readFileSync('supabase/functions/onvif-event-puller/index.ts', 'utf8');
for (const [pattern, why] of [
  [/renewThreshold\s*=/, 'limiar de renovação recalculado no transporte'],
  [/RENEW_(FLOOR|FRACTION)\s*=/, 'constante de renovação redefinida no transporte'],
  [/BACKOFF_[A-Z_]+\s*=/, 'constante de recuo redefinida no transporte'],
]) {
  if (pattern.test(edgeFn)) fail(`onvif-event-puller: ${why}`);
}
if (!edgeFn.includes('decidePullPoint(')) {
  fail('onvif-event-puller não usa decidePullPoint — a decisão migrou para o transporte');
}
if (!edgeFn.includes('pullPointEventKey(')) {
  fail('onvif-event-puller não usa a chave canônica de deduplicação');
}

/* -------- 4/5. banco -------------------------------------------------- */

// O pooler ocasionalmente derruba a primeira conexão ("auth_query secret check
// timed out"). Isso é ruído de infraestrutura, não defeito do código sob teste:
// reexecutamos algumas vezes antes de acusar falha, para o gate não virar fonte
// de alarme falso — gate instável é gate que o time aprende a ignorar.
const psql = (sql, attempts = 3) => {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      last = error;
      const text = String(error.stderr ?? '');
      // Erro de SQL é determinístico: repetir só atrasaria o diagnóstico.
      if (!/timed out|connection|server closed/i.test(text)) throw error;
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
  console.log('Onda 155 — psql indisponível: exercício do banco pulado (etapas 1 a 3 executadas).');
} else {
  for (const table of ['onvif_event_subscriptions', 'onvif_event_deliveries', 'internal_cron_secrets']) {
    const granted = psql(
      `SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema='public' AND table_name='${table}' AND grantee='anon'`,
    );
    if (granted !== '0') fail(`${table}: papel anon ainda possui ${granted} privilégio(s)`);

    const rls = psql(
      `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.${table}'::regclass`,
    );
    if (rls !== 't') fail(`${table}: RLS não está habilitada`);
  }

  for (const fn of ['record_onvif_event', 'invoke_onvif_event_puller', 'block_onvif_event_mutation']) {
    const acl = psql(
      `SELECT coalesce(array_to_string(proacl, ','), '') FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = '${fn}' LIMIT 1`,
    );
    if (/(^|,)anon=/.test(acl) || /(^|,)authenticated=/.test(acl)) {
      fail(`${fn}: rotina interna executável por anon/authenticated`);
    }
    const def = psql(
      `SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname='public' AND p.proname = '${fn}' LIMIT 1`,
    );
    if (!/SET search_path/i.test(def)) fail(`${fn}: sem search_path fixo`);
  }

  // Exercício real: imutabilidade + idempotência da ingestão.
  const exercise = (() => {
    const sql = `
BEGIN;
  CREATE TEMP TABLE onvif_gate_probe(inserted_first boolean, inserted_again boolean) ON COMMIT DROP;

  INSERT INTO public.onvif_event_deliveries
    (user_id, camera_id, topic, device_utc_time, dedup_key)
  SELECT '00000000-0000-4000-8000-000000000155', c.id,
         'tns1:Device/Trigger/DigitalInput', '2026-07-27T10:00:00Z', 'gate|probe|155'
    FROM public.cameras c LIMIT 1;

  DO $$
  DECLARE blocked_update boolean := false; blocked_delete boolean := false; n int;
  BEGIN
    SELECT count(*) INTO n FROM public.onvif_event_deliveries WHERE dedup_key = 'gate|probe|155';
    IF n = 0 THEN RAISE EXCEPTION 'sem câmera para exercitar a trilha'; END IF;

    BEGIN
      UPDATE public.onvif_event_deliveries SET topic = 'x' WHERE dedup_key = 'gate|probe|155';
    EXCEPTION WHEN others THEN blocked_update := true;
    END;
    BEGIN
      DELETE FROM public.onvif_event_deliveries WHERE dedup_key = 'gate|probe|155';
    EXCEPTION WHEN others THEN blocked_delete := true;
    END;
    IF NOT blocked_update THEN RAISE EXCEPTION 'trilha de eventos aceitou UPDATE'; END IF;
    IF NOT blocked_delete THEN RAISE EXCEPTION 'trilha de eventos aceitou DELETE'; END IF;
  END $$;

  -- Idempotência: o mesmo fato reentregue não pode virar duas linhas.
  DO $$
  DECLARE cam uuid; first_ok boolean; second_ok boolean;
  BEGIN
    SELECT id INTO cam FROM public.cameras LIMIT 1;
    first_ok := public.record_onvif_event(
      '00000000-0000-4000-8000-000000000155', cam, NULL,
      'tns1:VideoSource/MotionAlarm', 'VS_0', '2026-07-27T10:00:01Z',
      'gate|dedup|155', 'Changed', '{}'::jsonb);
    second_ok := public.record_onvif_event(
      '00000000-0000-4000-8000-000000000155', cam, NULL,
      'tns1:VideoSource/MotionAlarm', 'VS_0', '2026-07-27T10:00:01Z',
      'gate|dedup|155', 'Changed', '{}'::jsonb);
    IF NOT first_ok THEN RAISE EXCEPTION 'primeira ingestão não gravou'; END IF;
    IF second_ok THEN RAISE EXCEPTION 'reentrega do mesmo fato gerou nova linha'; END IF;
  END $$;
ROLLBACK;`;
    try {
      execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
      return null;
    } catch (error) {
      return String(error.stderr ?? error.message).trim();
    }
  })();
  if (exercise) fail(`exercício do banco falhou: ${exercise}`);
}

/* ------------------------------ relatório ---------------------------- */

console.log('Gate Onda 155 — eventos nativos ONVIF (PullPoint)');
console.log(`  espelhos TS ↔ borda : ${failures.some((f) => f.includes('divergiu')) ? 'FALHA' : 'OK'}`);
console.log(`  banco exercitado    : ${hasPsql ? 'sim (transação revertida)' : 'pulado'}`);
if (failures.length > 0) {
  console.log(`  resultado           : ${failures.length} falha(s)`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exit(1);
}
console.log('  resultado           : OK');
