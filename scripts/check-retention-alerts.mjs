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
// --- 2.5) Paridade do registro TS <-> SQL (Onda 244) --------------------------
// A carência de estreia depende de `registered_at`. Se as duas listas
// divergirem, a régua da tela e a do banco julgam rotinas diferentes.
{
  const sqlRows = query(
    `SELECT job_name || '|' || source_table || '|' || cadence_minutes || '|' ||
            coalesce(to_char(registered_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), '-')
       FROM public.retention_routine_registry() ORDER BY source_table`,
  ).map((r) => r[0]);
  const tsRows = [...RETENTION_ROUTINES]
    .sort((a, b) => a.sourceTable.localeCompare(b.sourceTable))
    .map(
      (r) =>
        `${r.jobName}|${r.sourceTable}|${r.cadenceMinutes}|${new Date(r.registeredAt)
          .toISOString()
          .slice(0, 19)}`,
    );
  check(
    'REGISTRO',
    sqlRows.join('\n') === tsRows.join('\n'),
    `registro divergente:\n  SQL: ${sqlRows.join(' ; ')}\n  TS : ${tsRows.join(' ; ')}`,
  );
}

for (const routine of RETENTION_ROUTINES) {
  const cadence = routine.cadenceMinutes;
  const registeredAtMs = new Date(routine.registeredAt).getTime();

  // Sem nenhuma execução gravada, `max(executed_at)` é NULL. A partir da Onda
  // 244 isso não é automaticamente crítico: dentro de `cadência + 15 min` do
  // registro a rotina está em estreia pendente (silêncio esperado); passado o
  // prazo, volta a ser crítico. As duas pontas são exercitadas contra o SQL.
  const [[anchored]] = query(
    `SELECT (max(executed_at) IS NOT NULL)::text FROM public.${routine.sourceTable}`,
  );
  if (anchored !== 'true') {
    for (const [name, age, expected] of [
      ['carência', 1, 'none'],
      ['carência vencida', cadence + 16, 'critical'],
    ]) {
      const [alert] = evaluateRetentionAlerts(
        [{ jobName: routine.jobName, minutesSinceLastRun: null, minutesSinceRegistration: age }],
        [routine],
      );
      const tsSeverity = alert ? alert.severity : 'none';
      const clock = new Date(registeredAtMs + age * 60_000).toISOString();
      const rows = query(`
        BEGIN;
        SELECT set_config('search_path', 'public', true);
        SELECT coalesce(
          (SELECT x->>'severity' FROM jsonb_array_elements(
             (public.evaluate_retention_alerts(timestamptz '${clock}'))->'routines') x
            WHERE x->>'routine' = 'retention:${routine.jobName}'),
          'missing');
        ROLLBACK;`)
        .map((r) => r[0])
        .filter((v) => v !== '' && v !== 'set_config');
      const sqlSeverity = rows[rows.length - 1];
      check(
        'ESTREIA',
        sqlSeverity === expected && tsSeverity === expected,
        `${routine.jobName} (${name}): SQL='${sqlSeverity}' TS='${tsSeverity}' esperado='${expected}'`,
      );
    }
    console.warn(`⚠️  ${routine.jobName}: sem execuções registradas — cenários de silêncio pulados.`);
    continue;
  }


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
      .filter((v) => v !== '' && v !== 'set_config');

    const sqlSeverity = rows[rows.length - 1];
    const tsSeverity = expected ? expected.severity : 'none';


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
