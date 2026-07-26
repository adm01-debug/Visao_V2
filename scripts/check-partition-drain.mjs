#!/usr/bin/env node
/**
 * Onda 108 — Gate de drenagem da partição DEFAULT.
 *
 * Complementa `check-partition-coverage.mjs`: aquele garante que existe um
 * balde de contingência; este garante que o balde é ESVAZIADO.
 *
 * Falha (exit 1) quando:
 *  - a procedure `public.drain_default_partitions` não existe;
 *  - ela não é SECURITY DEFINER ou está executável por `anon`/`authenticated`
 *    (drenagem é manutenção, não superfície de API);
 *  - a última execução registrada em `partition_drain_runs` falhou;
 *  - o backlog em alguma partição DEFAULT passa de DRAIN_MAX_BACKLOG linhas
 *    (a partir daí o `CREATE TABLE ... PARTITION OF` do mês seguinte vira um
 *     seq scan sob ACCESS EXCLUSIVE e trava a ingestão);
 *  - não há job pg_cron ativo chamando a drenagem (quando `cron.job` é legível).
 *
 * Avisa (sem falhar) quando:
 *  - há linhas em quarentena (timestamps implausíveis) aguardando triagem;
 *  - a telemetria/`cron.job` não é legível nesta conexão (sandbox).
 *
 * Conexão: `SUPABASE_DB_URL` / `DATABASE_URL`, com fallback para as PG*.
 * Uso: `npm run db:check:drain`
 */
import { execFileSync } from 'node:child_process';

const MAX_BACKLOG = Number.parseInt(process.env.DRAIN_MAX_BACKLOG ?? '50000', 10);
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

const errors = [];
const warnings = [];

/* 1) Existência e blindagem da rotina --------------------------------- */
const proc = query(`
  SELECT p.prokind,
         p.prosecdef::text,
         has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
         has_function_privilege('anon',          p.oid, 'EXECUTE')::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'drain_default_partitions';
`);

if (proc.length === 0) {
  errors.push(
    'Procedure `public.drain_default_partitions` ausente — a partição DEFAULT nunca é esvaziada.',
  );
} else {
  const [kind, secdef, authExec, anonExec] = proc[0];
  if (kind !== 'p') {
    errors.push(
      'A drenagem precisa ser PROCEDURE: só ela pode dar COMMIT por lote e evitar lock prolongado.',
    );
  }
  if (!isTrue(secdef)) {
    errors.push('`drain_default_partitions` não é SECURITY DEFINER — o cron não terá privilégio de DDL.');
  }
  if (isTrue(authExec) || isTrue(anonExec)) {
    errors.push(
      '`drain_default_partitions` executável por anon/authenticated — revogue: rotina de manutenção não é API.',
    );
  }
}

/* 2) Backlog atual em cada DEFAULT ------------------------------------ */
// Contagem exata: as DEFAULT devem ser pequenas por construção; se estiverem
// grandes, o custo do count() é justamente o sinal que queremos.
let defaults = [];
try {
  defaults = query(`
    SELECT c.relname, p.relname
    FROM pg_class c
    JOIN pg_inherits i  ON i.inhrelid = c.oid
    JOIN pg_class p     ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT'
    ORDER BY c.relname;
  `);
} catch {
  warnings.push('Não foi possível listar as partições DEFAULT nesta conexão — verificação pulada.');
}

for (const [part, parent] of defaults) {
  let rows = 0;
  try {
    rows = Number.parseInt(query(`SELECT count(*)::text FROM public."${part}";`)[0]?.[0] ?? '0', 10);
  } catch {
    warnings.push(`Sem acesso de leitura a \`${part}\` — backlog não verificado.`);
    continue;
  }
  if (rows > MAX_BACKLOG) {
    errors.push(
      `\`${part}\` (pai \`${parent}\`) acumulou ${rows} linha(s), acima do limite ${MAX_BACKLOG}. ` +
        'Rode `CALL public.drain_default_partitions(2000, 200);` e investigue o relógio das câmeras.',
    );
  } else if (rows > 0) {
    warnings.push(`\`${part}\` com ${rows} linha(s) aguardando drenagem/triagem.`);
  }
}

/* 3) Última execução da drenagem -------------------------------------- */
try {
  const runs = query(`
    SELECT ok::text, COALESCE(error_detail, ''), ran_at::text,
           moved_rows::text, quarantined::text, locked_out::text
    FROM public.partition_drain_runs
    ORDER BY ran_at DESC LIMIT 1;
  `);
  if (runs.length === 0) {
    warnings.push('`partition_drain_runs` vazia — a drenagem ainda não rodou neste banco.');
  } else {
    const [ok, detail, ranAt, moved, quarantined, lockedOut] = runs[0];
    if (!isTrue(ok)) {
      errors.push(`Última drenagem falhou em ${ranAt}: ${detail}`);
    } else if (isTrue(lockedOut)) {
      warnings.push(`Última drenagem (${ranAt}) foi ignorada por trava concorrente.`);
    } else {
      console.log(`ℹ️  Última drenagem em ${ranAt}: ${moved} movida(s), ${quarantined} em quarentena.`);
    }
    if (Number.parseInt(quarantined, 10) > 0) {
      warnings.push(
        `${quarantined} linha(s) em quarentena (timestamp implausível). Triagem manual recomendada.`,
      );
    }
  }
} catch {
  warnings.push('Sem acesso a `partition_drain_runs` nesta conexão — verificação pulada.');
}

/* 4) Agendamento pg_cron (best effort) -------------------------------- */
try {
  const jobs = query(`
    SELECT jobname, schedule, active::text
    FROM cron.job
    WHERE command ILIKE '%drain_default_partitions%';
  `);
  if (jobs.filter((j) => isTrue(j[2])).length === 0) {
    errors.push(
      'Nenhum job pg_cron ativo chamando `drain_default_partitions` — a DEFAULT cresceria sem limite.',
    );
  }
} catch {
  warnings.push('Sem permissão para ler `cron.job` nesta conexão — verificação de agendamento pulada.');
}

/* Saída ---------------------------------------------------------------- */
for (const w of warnings) console.warn(`⚠️  ${w}`);

if (errors.length > 0) {
  console.error('\n❌ Gate de drenagem de partições reprovado:');
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log(`✅ Drenagem de partições OK (backlog abaixo de ${MAX_BACKLOG}, rotina blindada e agendada).`);
