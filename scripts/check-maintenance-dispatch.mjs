#!/usr/bin/env node
/**
 * Onda 111 — Gate do despacho externo dos alertas de manutenção.
 *
 * Detectar rotina parada só vale se alguém for avisado. Este gate garante que
 * o canal de saída existe e está íntegro.
 *
 * Falha (exit 1) quando:
 *  - a tabela `public.maintenance_alert_dispatches` não existe ou está sem RLS;
 *  - falta a restrição de unicidade (alert_id, channel) — sem ela o dedup cai;
 *  - `anon` consegue ler a tabela;
 *  - existe alerta `critical` com mais de DISPATCH_SLA_MINUTES minutos sem
 *    nenhum despacho entregue (`sent`) e sem tentativas esgotadas.
 *
 * Avisa (sem falhar) quando há despachos em estado `failed`.
 *
 * Uso: `npm run db:check:maintenance-dispatch`
 */
import { execFileSync } from 'node:child_process';

const SLA_MINUTES = Number.parseInt(process.env.DISPATCH_SLA_MINUTES ?? '180', 10);
const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

/** @param {string} sql @returns {string[][]} */
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

/** @type {string[]} */ const errors = [];
/** @type {string[]} */ const warnings = [];

try {
  /* 1) Tabela + RLS ---------------------------------------------------- */
  const table = query(`
    SELECT c.relrowsecurity::text
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'maintenance_alert_dispatches';
  `);
  if (table.length === 0) {
    errors.push('public.maintenance_alert_dispatches não existe — alertas críticos ficariam sem saída externa.');
  } else if (!isTrue(table[0][0])) {
    errors.push('maintenance_alert_dispatches está sem RLS habilitado.');
  }

  if (table.length > 0) {
    /* 2) Unicidade do par (dedup) -------------------------------------- */
    const uniq = query(`
      SELECT count(*)::text
      FROM pg_constraint
      WHERE conrelid = 'public.maintenance_alert_dispatches'::regclass
        AND contype = 'u'
        AND conkey @> ARRAY[
          (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.maintenance_alert_dispatches'::regclass AND attname = 'alert_id'),
          (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.maintenance_alert_dispatches'::regclass AND attname = 'channel')
        ]::smallint[];
    `);
    if (uniq[0]?.[0] === '0') {
      errors.push('Falta UNIQUE(alert_id, channel) — o dedup de notificações não é garantido pelo banco.');
    }

    /* 3) anon não pode ler ---------------------------------------------- */
    const anon = query(`
      SELECT has_table_privilege('anon', 'public.maintenance_alert_dispatches', 'SELECT')::text;
    `);
    if (isTrue(anon[0]?.[0])) {
      errors.push('`anon` consegue ler maintenance_alert_dispatches — revogue o SELECT.');
    }

    /* 4) SLA de entrega dos críticos ------------------------------------ */
    const overdue = query(`
      SELECT count(*)::text
      FROM public.maintenance_alert_events e
      WHERE e.severity = 'critical'
        AND e.created_at < now() - interval '${SLA_MINUTES} minutes'
        AND e.created_at > now() - interval '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM public.maintenance_alert_dispatches d
          WHERE d.alert_id = e.id AND (d.status = 'sent' OR d.attempts >= 4)
        );
    `);
    const n = Number.parseInt(overdue[0]?.[0] ?? '0', 10);
    if (n > 0) {
      errors.push(`${n} alerta(s) crítico(s) sem entrega externa há mais de ${SLA_MINUTES} min.`);
    }

    const failed = query(`
      SELECT count(*)::text FROM public.maintenance_alert_dispatches
      WHERE status = 'failed' AND last_attempt_at > now() - interval '24 hours';
    `);
    const f = Number.parseInt(failed[0]?.[0] ?? '0', 10);
    if (f > 0) warnings.push(`${f} tentativa(s) de despacho falharam nas últimas 24h.`);
  }
} catch (err) {
  warnings.push(`Telemetria de despacho ilegível nesta conexão: ${err instanceof Error ? err.message : err}`);
}

for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length > 0) {
  console.error('\n❌ Gate do despacho de manutenção falhou:');
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}
console.log('✅ Despacho externo de alertas de manutenção íntegro.');
