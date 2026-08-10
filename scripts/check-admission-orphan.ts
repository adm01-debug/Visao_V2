#!/usr/bin/env tsx
/**
 * Onda 234 — Gate do fan-in de conciliação para o barramento de manutenção.
 *
 * Falha (exit 1) quando:
 *  - `admission_reconcile_severity` / `admission_reconcile_cooldown` /
 *    `evaluate_admission_reconcile_alerts` não existem;
 *  - alguma delas é executável por `anon`/`authenticated`;
 *  - o avaliador não é SECURITY DEFINER;
 *  - severidade ou cooldown do SQL divergem da régua TS em qualquer sonda;
 *  - o exercício dinâmico (transação revertida) não emite crítico para órfão,
 *    não respeita o cooldown, ou emite para estoque conciliado.
 *
 * Uso: `npm run db:check:admission-orphan`
 */
import { execFileSync } from 'node:child_process';
import {
  orphanAlertSeverity,
  orphanCooldownMinutes,
  BENIGN_RACE_REASON,
} from '../src/lib/alarms/admissionOrphanAlert.ts';
import type { ReconcileVerdict } from '../src/lib/alarms/admissionReconciliation.ts';

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

/* 1) Existência e blindagem ------------------------------------------------- */
const FUNCS = [
  { name: 'admission_reconcile_severity', args: 'text, text', definer: false },
  { name: 'admission_reconcile_cooldown', args: 'integer, text', definer: false },
  {
    name: 'evaluate_admission_reconcile_alerts',
    args: 'timestamp with time zone',
    definer: true,
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
  if (fn.definer && !isTrue(secdef)) {
    errors.push(`${fn.name} precisa ser SECURITY DEFINER.`);
  }
  if (isTrue(authExec)) errors.push(`${fn.name} não pode ser executável por 'authenticated'.`);
  if (isTrue(anonExec)) errors.push(`${fn.name} não pode ser executável por 'anon'.`);
}

/* 2) Paridade da severidade -------------------------------------------------- */
const VERDICTS: ReconcileVerdict[] = [
  'indeterminate',
  'no_run',
  'reconciled',
  'settling',
  'unaccounted',
];
const REASONS: (string | null)[] = [
  null,
  BENIGN_RACE_REASON,
  'contador_ilegivel',
  'inventario_ausente',
];

for (const verdict of VERDICTS) {
  for (const reason of REASONS) {
    const [row] = query(
      `SELECT COALESCE(public.admission_reconcile_severity('${verdict}', ${
        reason === null ? 'NULL' : `'${reason}'`
      }), 'none');`
    );
    probes += 1;
    const expected = orphanAlertSeverity(verdict, reason) ?? 'none';
    if (!row || row[0] !== expected) {
      errors.push(
        `severidade divergente para ${verdict}/${reason}: SQL=${row?.[0]} TS=${expected}`
      );
    }
  }
}

/* 3) Paridade do cooldown ---------------------------------------------------- */
for (const cadence of [1, 15, 60, 61, 119, 120, 179, 180, 1439, 1440, 2880, 100_000]) {
  for (const severity of ['critical', 'warning'] as const) {
    const [row] = query(`SELECT public.admission_reconcile_cooldown(${cadence}, '${severity}');`);
    probes += 1;
    const expected = orphanCooldownMinutes(cadence, severity);
    if (!row || Number(row[0]) !== expected) {
      errors.push(
        `cooldown divergente (${cadence}min/${severity}): SQL=${row?.[0]} TS=${expected}`
      );
    }
  }
}

/* 4) Cadência inválida falha alto nos dois lados ----------------------------- */
for (const bad of [0, -1]) {
  probes += 1;
  let sqlThrew = false;
  try {
    query(`SELECT public.admission_reconcile_cooldown(${bad}, 'critical');`);
  } catch {
    sqlThrew = true;
  }
  if (!sqlThrew) errors.push(`SQL aceitou cadência inválida ${bad}.`);
}

/* 5) Exercício dinâmico em transação revertida ------------------------------- */
const dynamic = `
BEGIN;
CREATE TEMP TABLE gate_result(msg text) ON COMMIT DROP;
DO $exercise$
DECLARE
  v_user uuid := gen_random_uuid();
  v_now  timestamptz := now();
  v_res  jsonb;
  v_cnt  int;
BEGIN
  -- Nenhum DELETE: as tabelas do livro são append-only por projeto. A arena é
  -- construída por inserção e desfeita pelo ROLLBACK da transação.
  SELECT count(*) INTO v_cnt FROM public.maintenance_alert_events
   WHERE routine = 'admission_reconcile:ledger_stock'
     AND created_at > v_now - interval '1440 minutes';
  IF v_cnt > 0 THEN
    INSERT INTO gate_result VALUES ('SKIP: alerta recente em cooldown impede o exercício');
    RETURN;
  END IF;

  -- 1) Estoque vazio: silêncio obrigatório.
  v_res := public.evaluate_admission_reconcile_alerts(v_now);
  IF v_res->>'verdict' <> 'reconciled' OR (v_res->>'emitted')::int <> 0 THEN
    RAISE EXCEPTION 'estoque conciliado não pode emitir: %', v_res;
  END IF;

  -- 2) Janela vencida (2 anos) sem execução legível: aviso no_run.
  INSERT INTO public.admission_ledger_windows
    (user_id, source_id, window_start, window_end, counts, total, admitted)
  VALUES (v_user, 'gate-orphan',
          v_now - interval '730 days', v_now - interval '730 days' + interval '1 hour',
          '{"admitted":1}'::jsonb, 1, 1);

  v_res := public.evaluate_admission_reconcile_alerts(v_now);
  IF v_res->>'verdict' <> 'no_run' OR v_res->>'severity' <> 'warning'
     OR (v_res->>'emitted')::int <> 1 THEN
    RAISE EXCEPTION 'sem execução legível deveria emitir aviso no_run: %', v_res;
  END IF;

  -- 3) Reexecução imediata: o cooldown segura a segunda emissão.
  v_res := public.evaluate_admission_reconcile_alerts(v_now);
  IF (v_res->>'emitted')::int <> 0 THEN
    RAISE EXCEPTION 'cooldown não segurou a reemissão: %', v_res;
  END IF;

  -- 4) Execução válida declarando passivo ZERO: a janela vencida vira órfã.
  INSERT INTO public.admission_ledger_purge_runs
    (executed_at, cutoff_at, retention_days, batch_cap, deleted_count, deferred_count,
     quarantined_count, capped, duration_ms)
  VALUES (v_now - interval '1 hour', v_now - interval '1 hour' - interval '365 days',
          365, 500, 0, 0, 0, false, 120);

  v_res := public.evaluate_admission_reconcile_alerts(v_now);
  IF v_res->>'verdict' <> 'unaccounted' OR v_res->>'severity' <> 'critical'
     OR (v_res->>'emitted')::int <> 1 THEN
    RAISE EXCEPTION 'órfão deveria emitir crítico: %', v_res;
  END IF;

  SELECT count(*) INTO v_cnt FROM public.maintenance_alert_events
   WHERE routine = 'admission_reconcile:ledger_stock' AND severity = 'critical'
     AND (detail->>'orphan_count')::bigint = 1
     AND (detail->>'cooldown_minutes')::int = 720;
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'detalhe do crítico não carrega órfão/cooldown medidos (n=%)', v_cnt;
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
} catch (e) {
  errors.push(`exercício dinâmico falhou: ${(e as Error).message}`);
}

/* Relatório ------------------------------------------------------------------ */
if (errors.length > 0) {
  console.error(`❌ Gate da Onda 234 falhou (${errors.length} problema(s)):`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`✅ Gate da Onda 234 aprovado — ${probes} sondas.`);
