#!/usr/bin/env node
/**
 * Onda 112 — Gate da detecção de relógio descalibrado por câmera.
 *
 * Câmera com RTC errado envenena as tabelas particionadas (linhas na DEFAULT,
 * bucket `pre_2000` da triagem) e distorce todo relatório temporal. Este gate
 * garante que a detecção existe, está blindada, roda e não deixa hardware
 * crítico sem tratamento por tempo indeterminado.
 *
 * Falha (exit 1) quando:
 *  - `public.detect_camera_clock_skew` não existe;
 *  - não é SECURITY DEFINER, ou é executável por `anon`;
 *  - `camera_clock_skew_runs` / `camera_clock_skew_findings` estão sem RLS
 *    ou legíveis por `anon`;
 *  - a última varredura falhou (`ok = false`);
 *  - existe câmera `critical` não suprimida há mais de CLOCK_SKEW_SLA_HOURS.
 *
 * Avisa (sem falhar) quando:
 *  - há câmeras em `warning`;
 *  - a varredura está atrasada;
 *  - a telemetria ou `cron.job` não são legíveis nesta conexão.
 *
 * Conexão: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as PG*.
 * Uso: `npm run db:check:clock-skew`
 */
import { execFileSync } from 'node:child_process';

const SLA_HOURS = Number.parseInt(process.env.CLOCK_SKEW_SLA_HOURS ?? '72', 10);
const STALE_HOURS = Number.parseInt(process.env.CLOCK_SKEW_STALE_HOURS ?? '48', 10);
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

/* 1) Blindagem da rotina ---------------------------------------------- */
const proc = query(`
  SELECT p.prosecdef::text,
         has_function_privilege('anon', p.oid, 'EXECUTE')::text,
         (p.prosrc ILIKE '%has_role(auth.uid()%')::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'detect_camera_clock_skew';
`);

if (proc.length === 0) {
  errors.push(
    'public.detect_camera_clock_skew não existe — a frota ficaria sem detecção de relógio descalibrado.',
  );
} else {
  const [secdef, anonExec, hasGuard] = proc[0];
  if (!isTrue(secdef)) errors.push('detect_camera_clock_skew deveria ser SECURITY DEFINER.');
  if (isTrue(anonExec)) errors.push('detect_camera_clock_skew é executável por `anon` — revogue o EXECUTE.');
  if (!isTrue(hasGuard)) {
    errors.push('detect_camera_clock_skew não contém a guarda interna de administrador (has_role).');
  }
}

/* 2) RLS e exposição das tabelas -------------------------------------- */
for (const table of ['camera_clock_skew_runs', 'camera_clock_skew_findings']) {
  const rows = query(`
    SELECT c.relrowsecurity::text,
           (SELECT count(*) FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = '${table}')::text,
           has_table_privilege('anon', 'public.${table}', 'SELECT')::text
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = '${table}';
  `);
  if (rows.length === 0) {
    errors.push(`Tabela public.${table} não existe.`);
    continue;
  }
  const [rls, policies, anonSelect] = rows[0];
  if (!isTrue(rls)) errors.push(`public.${table} está sem RLS habilitada.`);
  if (Number.parseInt(policies, 10) === 0) errors.push(`public.${table} não possui nenhuma política.`);
  if (isTrue(anonSelect)) errors.push(`public.${table} é legível por \`anon\` — revogue o SELECT.`);
}

/* 3) Saúde da última varredura ---------------------------------------- */
let lastRun = [];
try {
  lastRun = query(`
    SELECT ok::text,
           round(EXTRACT(EPOCH FROM (now() - ran_at)) / 3600)::text,
           cameras_analyzed::text, cameras_warning::text, cameras_critical::text,
           COALESCE(error_detail, '')
    FROM public.camera_clock_skew_runs
    ORDER BY ran_at DESC LIMIT 1;
  `);
} catch {
  warnings.push('Telemetria de varreduras não legível nesta conexão — verificação parcial.');
}

if (lastRun.length === 0) {
  warnings.push('Nenhuma varredura de relógio registrada ainda — execute detect_camera_clock_skew() uma vez.');
} else {
  const [ok, ageHours, analyzed, warning, critical, detail] = lastRun[0];
  if (!isTrue(ok)) {
    errors.push(`A última varredura de relógio falhou: ${detail || 'sem detalhe'}.`);
  }
  if (Number.parseInt(ageHours, 10) > STALE_HOURS) {
    warnings.push(`Última varredura há ${ageHours}h (limite de frescor: ${STALE_HOURS}h).`);
  }
  if (Number.parseInt(warning, 10) > 0) {
    warnings.push(`${warning} câmera(s) em atenção por desvio de relógio.`);
  }
  console.log(
    `ℹ️  Última varredura: ${analyzed} câmera(s) analisadas, ${warning} em atenção, ${critical} críticas.`,
  );
}

/* 4) SLA de tratamento dos achados críticos --------------------------- */
try {
  const overdue = query(`
    SELECT count(*)::text
    FROM public.camera_clock_skew_findings
    WHERE severity = 'critical'
      AND suppressed = false
      AND detected_at < now() - make_interval(hours => ${SLA_HOURS});
  `);
  const n = Number.parseInt(overdue[0]?.[0] ?? '0', 10);
  if (n > 0) {
    errors.push(
      `${n} câmera(s) online com relógio criticamente descalibrado há mais de ${SLA_HOURS}h sem correção.`,
    );
  }
} catch {
  warnings.push('Achados não legíveis nesta conexão — SLA não verificado.');
}

/* 5) Agendamento ------------------------------------------------------- */
try {
  const job = query(`
    SELECT schedule, active::text FROM cron.job WHERE jobname = 'camera-clock-skew-daily';
  `);
  if (job.length === 0) {
    errors.push("Job pg_cron 'camera-clock-skew-daily' não está agendado.");
  } else if (!isTrue(job[0][1])) {
    errors.push("Job pg_cron 'camera-clock-skew-daily' está inativo.");
  }
} catch {
  warnings.push('cron.job não legível nesta conexão — agendamento não verificado.');
}

/* Resultado ------------------------------------------------------------ */
for (const warning of warnings) console.warn(`⚠️  ${warning}`);
if (errors.length > 0) {
  console.error('❌ Detecção de relógio descalibrado comprometida:');
  for (const error of errors) console.error(`   - ${error}`);
  process.exit(1);
}
console.log('✅ Detecção de relógio das câmeras íntegra (rotina blindada, agendada e sem crítico vencido).');
