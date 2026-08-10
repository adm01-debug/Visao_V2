#!/usr/bin/env tsx
/**
 * Onda 235 — Gate do histórico de conciliações e da tendência do órfão.
 *
 * Falha (exit 1) quando:
 *  - a tabela `admission_reconcile_snapshots` não existe, é legível por
 *    `anon`/`authenticated`, ou não tem RLS forçada;
 *  - `admission_orphan_trend_classify` / `admission_orphan_trend` /
 *    `record_admission_reconcile_snapshot` não existem ou estão expostas;
 *  - a classificação SQL diverge da régua TS em qualquer série sondada;
 *  - o exercício dinâmico (transação revertida) não grava a foto, não recusa
 *    UPDATE/DELETE, ou aceita órfão maior que o estoque vencido.
 *
 * Uso: `npm run db:check:admission-trend`
 */
import { execFileSync } from 'node:child_process';
import { classifyOrphanSeries } from '../src/lib/alarms/admissionOrphanTrend.ts';

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

function query(sql: string): string[][] {
  const args = [...(conn ? [conn] : []), '-tA', '-F', '\u0001', '-X', '-q', '-c', sql];
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\u0001'));
}

const isTrue = (v: string) => v === 't' || v === 'true';
const errors: string[] = [];
let probes = 0;

/* 1) Tabela: existência, ACL e RLS forçada ---------------------------------- */
{
  const rows = query(`
    SELECT c.relrowsecurity::text,
           c.relforcerowsecurity::text,
           has_table_privilege('anon',          c.oid, 'SELECT')::text,
           has_table_privilege('authenticated', c.oid, 'SELECT')::text,
           has_table_privilege('authenticated', c.oid, 'INSERT')::text
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'admission_reconcile_snapshots';
  `);
  probes += 1;
  if (rows.length === 0) {
    errors.push('tabela public.admission_reconcile_snapshots não existe.');
  } else {
    const [rls, force, anonSel, authSel, authIns] = rows[0];
    if (!isTrue(rls)) errors.push('RLS não está habilitada no histórico.');
    if (!isTrue(force)) errors.push('RLS precisa ser FORCE no histórico.');
    if (isTrue(anonSel)) errors.push('anon não pode ler o histórico.');
    if (isTrue(authSel)) errors.push('authenticated não pode ler o histórico direto.');
    if (isTrue(authIns)) errors.push('authenticated não pode inserir no histórico.');
  }
}

/* 2) Funções: existência e blindagem ---------------------------------------- */
const FUNCS = [
  {
    name: 'admission_orphan_trend_classify',
    args: 'bigint[]',
    definer: false,
    authExec: false,
  },
  { name: 'admission_orphan_trend', args: 'integer', definer: true, authExec: true },
  {
    name: 'record_admission_reconcile_snapshot',
    args: 'timestamp with time zone',
    definer: true,
    authExec: false,
  },
] as const;

for (const fn of FUNCS) {
  const rows = query(`
    SELECT p.prosecdef::text,
           has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
           has_function_privilege('anon',          p.oid, 'EXECUTE')::text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = '${fn.name}'
      AND pg_catalog.oidvectortypes(p.proargtypes) = '${fn.args}';
  `);
  probes += 1;
  if (rows.length === 0) {
    errors.push(`public.${fn.name}(${fn.args}) não existe.`);
    continue;
  }
  const [secdef, authExec, anonExec] = rows[0];
  if (fn.definer && !isTrue(secdef)) errors.push(`${fn.name} precisa ser SECURITY DEFINER.`);
  if (isTrue(anonExec)) errors.push(`${fn.name} não pode ser executável por 'anon'.`);
  if (isTrue(authExec) !== fn.authExec) {
    errors.push(
      `${fn.name}: EXECUTE para 'authenticated' deveria ser ${fn.authExec}, está ${authExec}.`
    );
  }
}

/* 3) Paridade TS↔SQL da classificação --------------------------------------- */
function* sampleSeries(): Generator<number[]> {
  yield [];
  for (let len = 1; len <= 5; len += 1) {
    const total = 3 ** len;
    for (let code = 0; code < total; code += 1) {
      const s: number[] = [];
      let c = code;
      for (let i = 0; i < len; i += 1) {
        s.push(c % 3);
        c = Math.floor(c / 3);
      }
      yield s;
    }
  }
  // Séries longas e patológicas.
  yield [0, 0, 0, 0, 0];
  yield [1, 2, 3, 4, 5, 6, 7];
  yield [9, 8, 7, 6, 5, 4, 3];
  yield [5, 5, 5, 5];
  yield [0, 9, 1, 9, 1, 9];
}

const batch: { series: number[]; expected: string }[] = [];
for (const series of sampleSeries()) batch.push({ series, expected: classifyOrphanSeries(series) });

// Uma ida ao banco por lote de 60 sondas: paridade sem serializar 400 round-trips.
for (let i = 0; i < batch.length; i += 60) {
  const chunk = batch.slice(i, i + 60);
  const sql = chunk
    .map(
      (c, k) =>
        `SELECT ${k} AS k, public.admission_orphan_trend_classify(ARRAY[${c.series.join(',')}]::bigint[]) AS v`
    )
    .join(' UNION ALL ');
  const rows = query(`${sql} ORDER BY k;`);
  for (const [k, v] of rows) {
    const c = chunk[Number(k)];
    probes += 1;
    if (v !== c.expected) {
      errors.push(`classificação divergente [${c.series}]: SQL=${v} TS=${c.expected}`);
    }
  }
}

/* 4) Exercício dinâmico em transação revertida ------------------------------ */
const dynamic = `
BEGIN;
CREATE TEMP TABLE gate_result(msg text) ON COMMIT DROP;
DO $exercise$
DECLARE
  v_now timestamptz := now();
  v_id  bigint;
  v_ok  boolean;
BEGIN
  -- 1) Gravação normal.
  INSERT INTO public.admission_reconcile_snapshots
    (observed_at, verdict, orphan_count, expired_stock, drift_stock,
     declared_deferred, quarantined_stock, total_stock, retention_days)
  VALUES (v_now, 'unaccounted', 3, 10, 2, 1, 0, 40, 365)
  RETURNING id INTO v_id;

  -- 2) Append-only: UPDATE precisa ser recusado.
  v_ok := false;
  BEGIN
    UPDATE public.admission_reconcile_snapshots SET orphan_count = 0 WHERE id = v_id;
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'UPDATE no histórico não foi recusado'; END IF;

  -- 3) Append-only: DELETE precisa ser recusado.
  v_ok := false;
  BEGIN
    DELETE FROM public.admission_reconcile_snapshots WHERE id = v_id;
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'DELETE no histórico não foi recusado'; END IF;

  -- 4) Órfão maior que o estoque vencido é contabilidade impossível.
  v_ok := false;
  BEGIN
    INSERT INTO public.admission_reconcile_snapshots
      (observed_at, verdict, orphan_count, expired_stock, drift_stock,
       declared_deferred, quarantined_stock, total_stock, retention_days)
    VALUES (v_now, 'unaccounted', 11, 10, 0, 0, 0, 40, 365);
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'órfão > estoque vencido foi aceito'; END IF;

  -- 5) Veredito fora do vocabulário do banco é recusado.
  v_ok := false;
  BEGIN
    INSERT INTO public.admission_reconcile_snapshots
      (observed_at, verdict, orphan_count, expired_stock, drift_stock,
       declared_deferred, quarantined_stock, total_stock, retention_days)
    VALUES (v_now, 'tudo_certo', 0, 0, 0, 0, 0, 0, 365);
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'veredito inexistente foi aceito'; END IF;

  -- 6) A leitura da tendência exige papel admin (sem sessão, precisa recusar).
  v_ok := false;
  BEGIN
    PERFORM public.admission_orphan_trend(14);
  EXCEPTION WHEN OTHERS THEN v_ok := true;
  END;
  IF NOT v_ok THEN RAISE EXCEPTION 'tendência foi lida sem papel admin'; END IF;

  -- 7) A rotina de gravação executa fim a fim contra o inventário real.
  IF COALESCE((public.record_admission_reconcile_snapshot(v_now)->>'recorded')::boolean, false)
     IS NOT true THEN
    RAISE EXCEPTION 'record_admission_reconcile_snapshot não gravou';
  END IF;

  INSERT INTO gate_result VALUES ('DYNAMIC-OK');
END;
$exercise$;
SELECT msg FROM gate_result;
ROLLBACK;
`;

probes += 1;
try {
  const out = execFileSync(
    'psql',
    [...(conn ? [conn] : []), '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', dynamic],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  if (!/DYNAMIC-OK/.test(out)) {
    errors.push(`exercício dinâmico não confirmou execução: ${out.trim()}`);
  }
} catch (err) {
  const e = err as { stderr?: Buffer; message?: string };
  errors.push(`exercício dinâmico falhou: ${e.stderr?.toString() ?? e.message}`);
}

/* 5) Cron registrado --------------------------------------------------------- */
try {
  const rows = query(
    `SELECT schedule FROM cron.job WHERE jobname = 'record-admission-reconcile-snapshot';`
  );
  probes += 1;
  if (rows.length === 0) errors.push('cron record-admission-reconcile-snapshot não registrado.');
} catch {
  // Ambiente sem acesso ao schema cron: não é motivo para reprovar o gate.
}

if (errors.length > 0) {
  console.error(`❌ Gate da Onda 235 reprovado (${errors.length}):`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}
console.log(`✅ Gate da Onda 235 aprovado — ${probes} sondas.`);
