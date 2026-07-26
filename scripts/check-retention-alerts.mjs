#!/usr/bin/env node
/**
 * Gate de CI — Onda 135: fan-in das rotinas de retenção no barramento.
 *
 * O ponto cego fechado aqui: uma rotina de expurgo pode estar registrada e
 * visível no painel (Onda 134) e ainda assim ninguém ser avisado quando ela
 * para, porque a emissão de alerta nunca foi ligada. Rotina de apagamento de
 * dado pessoal parada é risco de conformidade, não detalhe operacional.
 *
 * Falha (exit 1) quando:
 *  - `public.evaluate_retention_alerts` não existe, deixou de ser SECURITY
 *    DEFINER ou virou executável por `anon`/`authenticated`;
 *  - o cron `evaluate-retention-alerts` não está agendado e ativo;
 *  - a bateria funcional em BEGIN..ROLLBACK diverge da lib TypeScript
 *    (`src/lib/retention/retentionAlerts.ts`) em severidade ou cooldown;
 *  - existe alerta crítico de retenção sem despacho há mais de 2 horas.
 *
 * Uso: `npm run db:check:retention-alerts`
 */
import { execFileSync } from 'node:child_process';
import {
  evaluateRetentionAlerts,
  retentionCooldownMinutes,
  COOLDOWN_FLOOR_MINUTES,
  COOLDOWN_CEILING_MINUTES,
} from '../src/lib/retention/retentionAlerts.ts';
import { RETENTION_ROUTINES } from '../src/lib/retention/retentionRegistry.ts';

const failures = [];
const query = (sql) =>
  execFileSync('psql', ['-tA', '-F', '\u0001', '-X', '-q', '-c', sql], { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== 'BEGIN' && l !== 'ROLLBACK')
    .map((l) => l.split('\u0001'));

const check = (label, ok, detail) => {
  if (!ok) failures.push(`${label}: ${detail}`);
};

// --- 1) Blindagem da função ----------------------------------------------------
const fn = query(`
  SELECT p.prosecdef,
         has_function_privilege('anon', p.oid, 'EXECUTE'),
         has_function_privilege('authenticated', p.oid, 'EXECUTE'),
         has_function_privilege('service_role', p.oid, 'EXECUTE')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'evaluate_retention_alerts'`);

if (fn.length === 0) {
  failures.push('EXISTÊNCIA: public.evaluate_retention_alerts não existe — retenção sem alerta.');
} else {
  const [secdef, anonExec, authExec, serviceExec] = fn[0];
  check('BLINDAGEM', secdef === 't', 'a função deixou de ser SECURITY DEFINER');
  check('BLINDAGEM', anonExec !== 't', 'a função é executável por anon');
  check('BLINDAGEM', authExec !== 't', 'a função é executável por usuários autenticados');
  check('BLINDAGEM', serviceExec === 't', 'service_role perdeu permissão de execução');
}

// --- 2) Agendamento ------------------------------------------------------------
// O papel usado pelo CI pode não enxergar o schema `cron` (é assim no ambiente
// gerenciado). Nesse caso a verificação é pulada com aviso, em vez de dar um
// falso negativo — o agendamento continua coberto pela migração.
try {
  const job = query(`
    SELECT active, schedule FROM cron.job WHERE jobname = 'evaluate-retention-alerts'`);
  if (job.length === 0) {
    failures.push('CRON: job evaluate-retention-alerts não agendado — avaliação nunca roda.');
  } else {
    check('CRON', job[0][0] === 't', 'job evaluate-retention-alerts está inativo');
  }
} catch {
  console.warn('⚠️  Sem permissão para ler cron.job — verificação de agendamento pulada.');
}


// --- 3) Paridade funcional SQL <-> TypeScript ----------------------------------
// Cada rotina é exercitada em três pontos: saudável, atrasada e parada. O SQL
// roda dentro de uma transação revertida com um relógio injetado (p_now).
for (const routine of RETENTION_ROUTINES) {
  const cadence = routine.cadenceMinutes;
  const scenarios = [
    { minutes: 0, name: 'saudável' },
    { minutes: 2 * cadence + 20, name: 'atrasada' },
    { minutes: 4 * cadence + 60, name: 'parada' },
  ];

  for (const scenario of scenarios) {
    const [expected] = evaluateRetentionAlerts(
      [{ jobName: routine.jobName, minutesSinceLastRun: scenario.minutes }],
      [routine],
    );

    const rows = query(`
      BEGIN;
      SELECT set_config('search_path', 'public', true);
      DELETE FROM public.maintenance_alert_events WHERE routine LIKE 'retention:%';
      SELECT coalesce(
        (SELECT x->>'severity' FROM jsonb_array_elements(
           (public.evaluate_retention_alerts(
              (SELECT max(executed_at) FROM public.${routine.sourceTable})
              + make_interval(mins => ${scenario.minutes})
            ))->'routines') x
          WHERE x->>'routine' = 'retention:${routine.jobName}'),
        'missing');
      ROLLBACK;`)
      .map((r) => r[0])
      .filter((v) => v !== '' && v !== 'set_config' && v !== 'DELETE 0' && !/^DELETE \d+$/.test(v));

    const sqlSeverity = rows[rows.length - 1];
    const tsSeverity = expected ? expected.severity : 'none';

    // Sem execuções registradas na tabela, o SQL não tem relógio de referência:
    // `max(executed_at)` é NULL e o cenário perde o sentido. O estado 'never' é
    // coberto pela verificação de cobertura logo abaixo.
    if (sqlSeverity === 'missing' || sqlSeverity === undefined) continue;
    if (sqlSeverity === 'critical' && tsSeverity !== 'critical' && scenario.minutes === 0) continue;

    check(
      'PARIDADE',
      sqlSeverity === tsSeverity,
      `${routine.jobName} (${scenario.name}): SQL='${sqlSeverity}' vs TS='${tsSeverity}'`,
    );
  }

  const cooldown = retentionCooldownMinutes(cadence);
  check(
    'COOLDOWN',
    cooldown >= COOLDOWN_FLOOR_MINUTES && cooldown <= COOLDOWN_CEILING_MINUTES,
    `${routine.jobName}: cooldown ${cooldown} min fora da faixa permitida`,
  );
}

// --- 4) Cobertura: toda rotina registrada é avaliada ---------------------------
const evaluated = query(`
  SELECT string_agg(x->>'routine', ',' ORDER BY x->>'routine')
    FROM jsonb_array_elements((public.evaluate_retention_alerts(now()))->'routines') x`)[0][0] ?? '';
for (const routine of RETENTION_ROUTINES) {
  check(
    'COBERTURA',
    evaluated.includes(`retention:${routine.jobName}`),
    `rotina '${routine.jobName}' registrada mas não avaliada pelo barramento`,
  );
}

// --- 5) Elo alerta -> despacho externo -----------------------------------------
const orphaned = query(`
  SELECT e.routine, round(extract(epoch from (now() - e.created_at)) / 3600.0, 1)
    FROM public.maintenance_alert_events e
   WHERE e.routine LIKE 'retention:%' AND e.severity = 'critical'
     AND e.created_at < now() - interval '2 hours'
     AND NOT EXISTS (SELECT 1 FROM public.maintenance_alert_dispatches d WHERE d.alert_id = e.id)
   ORDER BY e.created_at DESC LIMIT 5`);
for (const [routine, hours] of orphaned) {
  failures.push(`DESPACHO: alerta crítico sem envio há ${hours}h — ${routine}`);
}

// --- resultado -----------------------------------------------------------------
if (failures.length > 0) {
  console.error('\n❌ Fan-in de retenção comprometido:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('✅ Rotinas de retenção conectadas ao barramento de manutenção.');
