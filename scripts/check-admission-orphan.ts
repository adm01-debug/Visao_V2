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
      }), 'none');`,
    );
    probes += 1;
    const expected = orphanAlertSeverity(verdict, reason) ?? 'none';
    if (!row || row[0] !== expected) {
      errors.push(
        `severidade divergente para ${verdict}/${reason}: SQL=${row?.[0]} TS=${expected}`,
      );
    }
  }
}

/* 3) Paridade do cooldown ---------------------------------------------------- */
for (const cadence of [1, 15, 60, 61, 119, 120, 179, 180, 1439, 1440, 2880, 100_000]) {
  for (const severity of ['critical', 'warning'] as const) {
    const [row] = query(
      `SELECT public.admission_reconcile_cooldown(${cadence}, '${severity}');`,
    );
    probes += 1;
    const expected = orphanCooldownMinutes(cadence, severity);
    if (!row || Number(row[0]) !== expected) {
      errors.push(
        `cooldown divergente (${cadence}min/${severity}): SQL=${row?.[0]} TS=${expected}`,
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
DO $exercise$
DECLARE
  v_user uuid;
  v_now  timestamptz := now();
  v_res  jsonb;
  v_cnt  int;
BEGIN
  SELECT w.user_id INTO v_user FROM public.admission_ledger_windows w LIMIT 1;
  IF v_user IS NULL THEN
    SELECT p.id INTO v_user FROM public.profiles p LIMIT 1;
  END IF;
  IF v_user IS NULL THEN
    RAISE NOTICE 'SKIP: sem usuário para exercitar';
    RETURN;
  END IF;

  -- Limpa a arena dentro da transação (será revertida).
  DELETE FROM public.maintenance_alert_events WHERE routine = 'admission_reconcile:ledger_stock';
  DELETE FROM public.admission_ledger_purge_runs;
  DELETE FROM public.admission_ledger_windows;

  -- Janela vencida (2 anos) e nenhuma execução: veredito no_run → warning.
  INSERT INTO public.admission_ledger_windows
    (user_id, source_id, window_start, window_end, admitted_count, refused_count,
     indeterminate_count, admitted_by_reason, refused_by_reason)
  VALUES (v_user, 'gate-orphan', v_now - interval '730 days', v_now - interval '729 days',
          0, 0, 0, '{}'::jsonb, '{}'::jsonb);

  v_res := public.evaluate_admission_reconcile_alerts(v_now);
  IF v_res->>'verdict' <> 'no_run' OR v_res->>'severity' <> 'warning'
     OR (v_res->>'emitted')::int <> 1 THEN
    RAISE EXCEPTION 'sem execução legível deveria emitir aviso no_run: %', v_res;
  END IF;

  -- Reexecução imediata: cooldown segura a segunda emissão.
  v_res := public.evaluate_admission_reconcile_alerts(v_now);
  IF (v_res->>'emitted')::int <> 0 THEN
    RAISE EXCEPTION 'cooldown não segurou a reemissão: %', v_res;
  END IF;

  -- Execução válida declarando passivo ZERO: a janela vencida vira órfã.
  INSERT INTO public.admission_ledger_purge_runs
    (executed_at, cutoff_at, retention_days, batch_cap, deleted_count, deferred_count, capped)
  VALUES (v_now - interval '1 hour', v_now - interval '1 hour' - interval '365 days',
          365, 500, 0, 0, false);

  v_res := public.evaluate_admission_reconcile_alerts(v_now);
  IF v_res->>'verdict' <> 'unaccounted' OR v_res->>'severity' <> 'critical'
     OR (v_res->>'emitted')::int <> 1 THEN
    RAISE EXCEPTION 'órfão deveria emitir crítico: %', v_res;
  END IF;

  SELECT count(*) INTO v_cnt FROM public.maintenance_alert_events
   WHERE routine = 'admission_reconcile:ledger_stock' AND severity = 'critical'
     AND (detail->>'orphan_count')::bigint = 1;
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'detalhe do crítico não carrega o órfão medido (n=%)', v_cnt;
  END IF;

  -- Estoque limpo: silêncio.
  DELETE FROM public.admission_ledger_windows;
  DELETE FROM public.maintenance_alert_events WHERE routine = 'admission_reconcile:ledger_stock';
  v_res := public.evaluate_admission_reconcile_alerts(v_now);
  IF v_res->>'verdict' <> 'reconciled' OR (v_res->>'emitted')::int <> 0 THEN
    RAISE EXCEPTION 'estoque conciliado não pode emitir: %', v_res;
  END IF;

  RAISE NOTICE 'DYNAMIC-OK';
END;
$exercise$;
ROLLBACK;
`;

probes += 1;
try {
  const out = execFileSync(
    'psql',
    [...(conn ? [conn] : []), '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', dynamic],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (!/DYNAMIC-OK|SKIP/.test(out)) {
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
