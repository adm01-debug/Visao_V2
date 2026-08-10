#!/usr/bin/env node
/**
 * Onda 117 — Gate do escalonamento de alertas não reconhecidos.
 *
 * Ponto cego que este gate fecha: a escada pode existir e mesmo assim ser
 * inócua. Os modos de falha reais são (a) a rotina perder o agendamento e
 * ninguém notar, porque a ausência de escalonamento parece "tudo calmo";
 * (b) a régua do PL/pgSQL divergir de `src/lib/maintenanceEscalation.ts`,
 * fazendo a UI prometer um nível e o cron aplicar outro; (c) a função de
 * reconhecimento virar executável sem checagem de papel, permitindo que um
 * usuário comum silencie um incidente crítico.
 *
 * Falha (exit 1) quando:
 *  - `escalate_stale_maintenance_alerts` não existe, não é SECURITY DEFINER,
 *    ou é executável por `anon`/`authenticated`;
 *  - `acknowledge_maintenance_alert` é executável por `anon`;
 *  - `maintenance_alert_escalations` está sem RLS ou acessível por `anon`;
 *  - o nível gravado no banco EXCEDE o que a lib justifica (escalonamento
 *    fantasma) para qualquer alerta aberto;
 *  - existe alerta em nível de plantão (3) ainda sem reconhecimento;
 *  - o veredito da lib sobre os dados reais é `critical`.
 *
 * Avisa (sem falhar) quando o veredito é `warning` ou quando o cron não é
 * legível nesta conexão.
 *
 * Uso: `npm run db:check:escalation`
 */
import { execFileSync } from 'node:child_process';
import {
  DEFAULT_ESCALATION_THRESHOLDS,
  evaluateEscalations,
  targetLevelForAge,
} from '../src/lib/maintenanceEscalation.ts';

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

// 1) Rotina automática: existe, é DEFINER e não é chamável por usuário final.
const fn = query(`
  SELECT p.prosecdef::text,
         has_function_privilege('anon', p.oid, 'EXECUTE')::text,
         has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'escalate_stale_maintenance_alerts'
`);
if (fn.length === 0) {
  errors.push('função public.escalate_stale_maintenance_alerts() não existe');
} else {
  const [secdef, anonExec, authExec] = fn[0];
  if (secdef !== 'true')
    errors.push('escalate_stale_maintenance_alerts deixou de ser SECURITY DEFINER');
  if (anonExec === 'true') errors.push('escalate_stale_maintenance_alerts é executável por anon');
  if (authExec === 'true')
    errors.push('escalate_stale_maintenance_alerts é executável por authenticated');
}

// 2) Reconhecimento: é chamável por authenticated (a checagem de papel é
//    interna), mas nunca por anon.
const ackFn = query(`
  SELECT has_function_privilege('anon', p.oid, 'EXECUTE')::text,
         pg_get_functiondef(p.oid) ~ 'has_role' AS guarded
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'acknowledge_maintenance_alert'
`);
if (ackFn.length === 0) {
  errors.push('função public.acknowledge_maintenance_alert() não existe');
} else {
  const [anonExec, guarded] = ackFn[0];
  if (anonExec === 'true') errors.push('acknowledge_maintenance_alert é executável por anon');
  if (guarded !== 't' && guarded !== 'true')
    errors.push(
      'acknowledge_maintenance_alert não verifica has_role — qualquer usuário silenciaria alertas'
    );
}

// 3) Tabela de histórico: RLS ligada e sem exposição anônima.
const tbl = query(`
  SELECT c.relrowsecurity::text,
         has_table_privilege('anon', c.oid, 'SELECT')::text,
         (SELECT count(*)::text FROM pg_policies WHERE schemaname='public' AND tablename='maintenance_alert_escalations')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='maintenance_alert_escalations'
`);
if (tbl.length === 0) {
  errors.push('tabela public.maintenance_alert_escalations não existe');
} else {
  const [rls, anonSelect, policies] = tbl[0];
  if (rls !== 'true') errors.push('maintenance_alert_escalations está sem RLS');
  if (anonSelect === 'true') errors.push('maintenance_alert_escalations é legível por anon');
  if (Number(policies) === 0) errors.push('maintenance_alert_escalations não tem nenhuma policy');
}

// 4) Agendamento ativo (pode não ser legível na conexão do sandbox).
try {
  const job = query(`
    SELECT active::text, schedule FROM cron.job WHERE jobname = 'escalate-stale-maintenance-alerts'
  `);
  if (job.length === 0)
    errors.push("job de cron 'escalate-stale-maintenance-alerts' não está agendado");
  else if (job[0][0] !== 'true')
    errors.push("job de cron 'escalate-stale-maintenance-alerts' está inativo");
} catch {
  warnings.push(
    'Sem permissão para ler `cron.job` nesta conexão — verificação de agendamento pulada.'
  );
}

// 5) Paridade lib × banco sobre os alertas abertos reais.
const rows = query(`
  SELECT e.id,
         e.routine,
         e.severity,
         COALESCE(e.reason, ''),
         extract(epoch from e.created_at)::text,
         COALESCE(extract(epoch from e.acknowledged_at)::text, ''),
         e.escalation_level::text,
         COALESCE(extract(epoch from e.last_escalated_at)::text, ''),
         (EXISTS (SELECT 1 FROM public.maintenance_alert_dispatches d
                   WHERE d.alert_id = e.id AND d.status = 'sent'))::text,
         (SELECT count(*)::text FROM public.maintenance_alert_dispatches d
           WHERE d.alert_id = e.id AND d.status = 'failed'),
         (NOT EXISTS (SELECT 1 FROM public.maintenance_alert_dispatches d
                       WHERE d.alert_id = e.id))::text
    FROM public.maintenance_alert_events e
   WHERE e.acknowledged_at IS NULL
     AND e.created_at > now() - INTERVAL '30 days'
   ORDER BY e.created_at
`);

const nowMs = Date.now();
const alerts = rows.map((r) => ({
  id: r[0],
  routine: r[1],
  severity: /** @type {'warning'|'critical'} */ (r[2]),
  reason: r[3],
  createdAtMs: Number(r[4]) * 1000,
  acknowledgedAtMs: r[5] === '' ? null : Number(r[5]) * 1000,
  escalationLevel: /** @type {0|1|2|3} */ (Number(r[6])),
  lastEscalatedAtMs: r[7] === '' ? null : Number(r[7]) * 1000,
  dispatch: {
    delivered: r[8] === 'true' || r[8] === 't',
    failedChannels: Number(r[9]),
    neverAttempted: r[10] === 'true' || r[10] === 't',
  },
}));

for (const a of alerts) {
  const ageMin = Math.max(0, (nowMs - a.createdAtMs) / 60_000);
  const justified = targetLevelForAge(
    a.severity,
    ageMin,
    a.dispatch,
    DEFAULT_ESCALATION_THRESHOLDS
  );
  // Escalonamento fantasma: o banco subiu além do que a idade permite. É pior
  // que atraso — significa que o painel e o pager discordam da política.
  if (a.escalationLevel > justified) {
    errors.push(
      `alerta ${a.id} (${a.routine}) está em nível ${a.escalationLevel}, ` +
        `mas a política justifica no máximo ${justified} para ${Math.round(ageMin)} min`
    );
  }
  if (a.escalationLevel >= 3) {
    errors.push(`alerta ${a.id} (${a.routine}) atingiu o plantão e continua sem reconhecimento`);
  }
}

const verdict = evaluateEscalations({ nowMs, alerts });
if (verdict.severity === 'critical') errors.push(`veredito crítico da escada: ${verdict.reason}`);
else if (verdict.severity === 'warning') warnings.push(`atenção: ${verdict.reason}`);

console.log(`Onda 117 — alertas abertos avaliados: ${alerts.length}`);
console.log(`Onda 117 — veredito: ${verdict.severity} — ${verdict.reason}`);

for (const w of warnings) console.warn(`⚠️  ${w}`);

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} problema(s) no escalonamento de alertas:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('✅ Escada de escalonamento íntegra.');
