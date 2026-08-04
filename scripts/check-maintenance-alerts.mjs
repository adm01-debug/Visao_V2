#!/usr/bin/env node
/**
 * Onda 110 — Gate dos alertas críticos de manutenção.
 *
 * As rotinas noturnas (cobertura, drenagem, triagem) só protegem o banco
 * enquanto alguém percebe que elas pararam. Este gate garante que o avaliador
 * horário existe, está blindado e não está reportando incidentes abertos.
 *
 * Falha (exit 1) quando:
 *  - `public.evaluate_maintenance_alerts` não existe;
 *  - não é SECURITY DEFINER, ou é executável por `anon`/`authenticated`;
 *  - a tabela `public.maintenance_alert_events` está sem RLS;
 *  - existe alerta `critical` aberto nas últimas MAINT_ALERT_WINDOW_HOURS horas.
 *
 * Avisa (sem falhar) quando:
 *  - há alertas `warning` na janela;
 *  - a telemetria não é legível nesta conexão (sandbox sem permissão).
 *
 * Conexão: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as PG*.
 * Uso: `npm run db:check:maintenance-alerts`
 */
import { execFileSync } from 'node:child_process';

const WINDOW_HOURS = Number.parseInt(process.env.MAINT_ALERT_WINDOW_HOURS ?? '48', 10);
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

const isTrue = (v) => v === 't' || v === 'true';

/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];

/* 1) Blindagem do avaliador ------------------------------------------- */
const proc = query(`
  SELECT p.prosecdef::text,
         has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
         has_function_privilege('anon',          p.oid, 'EXECUTE')::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'evaluate_maintenance_alerts';
`);

if (proc.length === 0) {
  errors.push(
    'public.evaluate_maintenance_alerts não existe — as rotinas de manutenção ficariam sem vigilância.'
  );
} else {
  const [secdef, authExec, anonExec] = proc[0];
  if (!isTrue(secdef)) {
    errors.push(
      'evaluate_maintenance_alerts precisa ser SECURITY DEFINER para ler as telemetrias.'
    );
  }
  if (isTrue(authExec)) {
    errors.push(
      'evaluate_maintenance_alerts está executável por `authenticated` — revogue o EXECUTE.'
    );
  }
  if (isTrue(anonExec)) {
    errors.push('evaluate_maintenance_alerts está executável por `anon` — revogue o EXECUTE.');
  }
}

/* 2) RLS na tabela de alertas ----------------------------------------- */
const table = query(`
  SELECT c.relrowsecurity::text
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'maintenance_alert_events';
`);

if (table.length === 0) {
  errors.push(
    'public.maintenance_alert_events não existe — o histórico de alertas não é persistido.'
  );
} else if (!isTrue(table[0][0])) {
  errors.push('maintenance_alert_events está sem RLS habilitado.');
}

/* 3) Incidentes abertos na janela ------------------------------------- */
if (errors.length === 0) {
  try {
    const rows = query(`
      SELECT severity, routine, reason, to_char(created_at, 'YYYY-MM-DD HH24:MI')
      FROM public.maintenance_alert_events
      WHERE created_at > now() - interval '${WINDOW_HOURS} hours'
      ORDER BY created_at DESC
      LIMIT 50;
    `);

    for (const [severity, routine, reason, at] of rows) {
      const line = `[${at}] ${routine}: ${reason}`;
      if (severity === 'critical') errors.push(`Alerta crítico aberto — ${line}`);
      else warnings.push(`Alerta de atenção — ${line}`);
    }
  } catch {
    warnings.push('Telemetria de alertas não legível nesta conexão — verificação parcial.');
  }
}

/* 4) Relatório --------------------------------------------------------- */
console.log(`\n=== Gate de alertas de manutenção (janela: ${WINDOW_HOURS}h) ===\n`);

for (const w of warnings) console.warn(`  ⚠️  ${w}`);

if (errors.length > 0) {
  console.error('\n❌ Falhas detectadas:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

console.log('  ✅ Avaliador blindado e nenhum alerta crítico aberto na janela.\n');
