#!/usr/bin/env node
/**
 * Onda 114 — Gate do fan-in de alertas de manutenção.
 *
 * Verifica que os detectores especializados (Onda 112 — relógio das câmeras;
 * Onda 113 — backlog das partições) estão de fato conectados ao barramento de
 * alertas (Onda 110) e, por herança, ao despacho externo (Onda 111).
 *
 * O ponto cego que este gate fecha: um detector pode estar perfeito e mesmo
 * assim ninguém ser avisado, porque a rotina nunca foi cadastrada no avaliador.
 * Detecção sem notificação é equivalente a não detectar.
 *
 * Falha (exit 1) quando:
 *  - `evaluate_maintenance_alerts` não menciona as duas rotinas sintéticas;
 *  - a função deixou de ser SECURITY DEFINER ou virou executável por `anon`;
 *  - o veredito calculado por `src/lib/maintenanceSourceAlerts.ts` sobre os
 *    dados reais é `critical` (problema aberto exigindo ação humana);
 *  - existe alerta `critical` dessas rotinas sem despacho correspondente há
 *    mais de 2 horas (o elo detector→Telegram está partido).
 *
 * Avisa (sem falhar) quando o veredito é `warning`.
 *
 * Uso: `npm run db:check:maintenance-sources`
 */
import { execFileSync } from 'node:child_process';
import { evaluateMaintenanceSources } from '../src/lib/maintenanceSourceAlerts.ts';

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

/**
 * @param {string} sql
 * @returns {string[][]}
 */
function query(sql) {
  const args = [...(conn ? [conn] : []), '-tA', '-F', '\u0001', '-X', '-q', '-c', sql];
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\u0001'));
}

const errors = [];
const warnings = [];

// -------------------------------------------------------- 1) blindagem da função
const fn = query(`
  -- Booleanos em vez do corpo inteiro: pg_get_functiondef é multi-linha e
  -- quebraria o parser linha-a-linha desta ferramenta.
  SELECT p.prosecdef,
         has_function_privilege('anon', p.oid, 'EXECUTE'),
         pg_get_functiondef(p.oid) LIKE '%camera_clock_skew%',
         pg_get_functiondef(p.oid) LIKE '%partition_backlog_trend%'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'evaluate_maintenance_alerts'
`);

if (fn.length === 0) {
  errors.push('public.evaluate_maintenance_alerts não existe — o barramento de alertas sumiu.');
} else {
  const [secdef, anonExec, hasSkew, hasBacklog] = fn[0];
  if (secdef !== 't') errors.push('evaluate_maintenance_alerts deixou de ser SECURITY DEFINER.');
  if (anonExec === 't') errors.push('evaluate_maintenance_alerts é executável por anon.');
  if (hasSkew !== 't') {
    errors.push("Rotina 'camera_clock_skew' não está cadastrada no avaliador — detector órfão.");
  }
  if (hasBacklog !== 't') {
    errors.push(
      "Rotina 'partition_backlog_trend' não está cadastrada no avaliador — detector órfão."
    );
  }
}

// ------------------------------------------------- 2) veredito sobre dados reais
const skewRows = query(`
  SELECT extract(epoch from ran_at) * 1000, ok, coalesce(error_detail, ''),
         cameras_analyzed, cameras_warning, cameras_critical
  FROM public.camera_clock_skew_runs ORDER BY ran_at DESC LIMIT 1
`);

const clockSkewRun =
  skewRows.length === 0
    ? null
    : {
        ranAtMs: Number.parseFloat(skewRows[0][0]),
        ok: skewRows[0][1] === 't',
        errorDetail: skewRows[0][2] || null,
        camerasAnalyzed: Number.parseInt(skewRows[0][3], 10),
        camerasWarning: Number.parseInt(skewRows[0][4], 10),
        camerasCritical: Number.parseInt(skewRows[0][5], 10),
      };

const backlogRows = query(`
  SELECT DISTINCT ON (parent_table) parent_table, row_count,
         extract(epoch from (now() - sampled_at)) / 3600.0
  FROM public.partition_backlog_samples
  ORDER BY parent_table, sampled_at DESC
`);

const backlogVerdicts = backlogRows.map(([parent, rows, ageHours]) => {
  const currentRows = Number.parseInt(rows, 10);
  const age = Number.parseFloat(ageHours);
  return {
    parent,
    // Reproduzimos aqui apenas a leitura dos fatos; a decisão fica na lib.
    severity: currentRows > 50_000 ? 'critical' : currentRows > 10_000 ? 'warning' : 'ok',
    currentRows,
    hoursToSaturation: null,
    stale: age > 6,
  };
});

const candidates = evaluateMaintenanceSources({
  nowMs: Date.now(),
  clockSkewRun,
  backlogVerdicts,
});

for (const c of candidates) {
  const line = `${c.routine}: ${c.reason}`;
  if (c.severity === 'critical') errors.push(line);
  else warnings.push(line);
}

if (candidates.length === 0) {
  console.log('ℹ️  Detectores especializados sem achados pendentes.');
}

// --------------------------------------------- 3) elo detector → despacho externo
const orphaned = query(`
  SELECT e.routine, e.reason, round(extract(epoch from (now() - e.created_at)) / 3600.0, 1)
  FROM public.maintenance_alert_events e
  WHERE e.routine IN ('camera_clock_skew', 'partition_backlog_trend')
    AND e.severity = 'critical'
    AND e.created_at < now() - interval '2 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.maintenance_alert_dispatches d WHERE d.alert_id = e.id
    )
  ORDER BY e.created_at DESC
  LIMIT 5
`);

for (const [routine, reason, hours] of orphaned) {
  errors.push(`Alerta crítico sem despacho há ${hours}h — ${routine}: ${reason}`);
}

// -------------------------------------------------------------------- resultado
for (const w of warnings) console.warn(`⚠️  ${w}`);

if (errors.length > 0) {
  console.error('\n❌ Fan-in de alertas de manutenção comprometido:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('✅ Fan-in de alertas de manutenção íntegro (detectores conectados e despachados).');
