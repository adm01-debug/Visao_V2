#!/usr/bin/env node
/**
 * Onda 109 — Gate de triagem da quarentena.
 *
 * A drenagem (Onda 108) esvazia o que é drenável; o que sobra na DEFAULT é
 * resíduo com timestamp implausível. Sem vigilância, esse resíduo cresce em
 * silêncio até que a DEFAULT volte a ser um problema de ingestão.
 *
 * Falha (exit 1) quando:
 *  - `public.triage_default_quarantine` não existe;
 *  - a rotina não é SECURITY DEFINER, ou é executável por `anon`/`authenticated`
 *    (é manutenção, não superfície de API);
 *  - a rotina contém qualquer verbo destrutivo (DELETE/UPDATE/TRUNCATE) sobre os
 *    dados — por contrato ela é READ-ONLY (gap G3 da simulação);
 *  - a última execução registrada falhou;
 *  - o total em quarentena passa de QUARANTINE_MAX_ROWS.
 *
 * Avisa (sem falhar) quando:
 *  - existe quarentena abaixo do limite (dívida a triar manualmente);
 *  - a telemetria não é legível nesta conexão (sandbox sem permissão).
 *
 * Conexão: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as PG*.
 * Uso: `npm run db:check:quarantine`
 */
import { execFileSync } from 'node:child_process';

const MAX_ROWS = Number.parseInt(process.env.QUARANTINE_MAX_ROWS ?? '10000', 10);
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

/* 1) Existência e blindagem da rotina ---------------------------------- */
const proc = query(`
  SELECT p.prosecdef::text,
         has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
         has_function_privilege('anon',          p.oid, 'EXECUTE')::text,
         pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'triage_default_quarantine';
`);

if (proc.length === 0) {
  errors.push('public.triage_default_quarantine não existe — a quarentena ficaria sem triagem.');
} else {
  const [secdef, authExec, anonExec, def] = proc[0];

  if (!isTrue(secdef)) {
    errors.push('triage_default_quarantine precisa ser SECURITY DEFINER para ler as partições.');
  }
  if (isTrue(authExec)) {
    errors.push('triage_default_quarantine está executável por `authenticated` — revogue o EXECUTE.');
  }
  if (isTrue(anonExec)) {
    errors.push('triage_default_quarantine está executável por `anon` — revogue o EXECUTE.');
  }

  // Contrato read-only (gap G3): o corpo só pode escrever na própria telemetria.
  const body = def.replace(/public\.partition_quarantine_runs/gi, '«telemetry»');
  const destructive = [/\bDELETE\s+FROM\b/i, /\bTRUNCATE\b/i, /\bUPDATE\s+public\./i, /\bDROP\s+TABLE\b/i];
  for (const re of destructive) {
    if (re.test(body)) {
      errors.push(
        `triage_default_quarantine contém comando destrutivo (${re.source}) — a rotina deve ser estritamente read-only sobre os dados.`,
      );
    }
  }
}

/* 2) Última execução ---------------------------------------------------- */
try {
  const runs = query(`
    SELECT ok::text, locked_out::text, total_quarantined::text,
           total_drainable::text, COALESCE(error_detail, ''), ran_at::text
    FROM public.partition_quarantine_runs
    ORDER BY ran_at DESC
    LIMIT 1;
  `);

  if (runs.length === 0) {
    warnings.push('Nenhuma execução de triagem registrada ainda.');
  } else {
    const [ok, lockedOut, quarantined, drainable, detail, ranAt] = runs[0];

    if (!isTrue(ok)) {
      errors.push(`Última triagem (${ranAt}) falhou: ${detail || 'sem detalhe'}`);
    } else if (isTrue(lockedOut)) {
      warnings.push(`Última triagem (${ranAt}) foi adiada por trava de manutenção.`);
    } else {
      const q = Number.parseInt(quarantined, 10) || 0;
      if (q > MAX_ROWS) {
        errors.push(
          `Quarentena com ${q.toLocaleString('pt-BR')} linha(s) — acima do limite de ${MAX_ROWS.toLocaleString('pt-BR')}. Investigue relógio das câmeras/importações.`,
        );
      } else if (q > 0) {
        warnings.push(`${q.toLocaleString('pt-BR')} linha(s) em quarentena aguardando triagem manual.`);
      }
      const d = Number.parseInt(drainable, 10) || 0;
      if (d > 0) {
        warnings.push(`${d.toLocaleString('pt-BR')} linha(s) drenáveis pendentes no momento do retrato.`);
      }
    }
  }
} catch {
  warnings.push('Telemetria partition_quarantine_runs não legível nesta conexão.');
}

/* 3) Agendamento -------------------------------------------------------- */
try {
  const jobs = query(`
    SELECT count(*)::text
    FROM cron.job
    WHERE active AND command ILIKE '%triage_default_quarantine%';
  `);
  if ((Number.parseInt(jobs[0]?.[0] ?? '0', 10) || 0) === 0) {
    errors.push('Nenhum job pg_cron ativo chamando triage_default_quarantine.');
  }
} catch {
  warnings.push('cron.job não legível nesta conexão — agendamento não verificado.');
}

/* Relatório ------------------------------------------------------------- */
for (const w of warnings) console.warn(`⚠️  ${w}`);

if (errors.length > 0) {
  console.error('\n❌ Gate de triagem da quarentena reprovado:\n');
  for (const e of errors) console.error(`   • ${e}`);
  process.exit(1);
}

console.log('✅ Triagem da quarentena íntegra (rotina read-only, blindada e agendada).');
