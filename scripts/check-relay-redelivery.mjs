#!/usr/bin/env node
/**
 * Gate da Onda 122 — Saúde de reentrega da fila de relay.
 *
 * Verifica que o avaliador SQL existe, está blindado, agendado, e que suas
 * constantes e a régua de imputação estão em paridade com
 * `src/lib/relayRedeliveryHealth.ts`. Também confere que o piso estatístico de
 * Wilson do SQL coincide com o do TypeScript nos pontos de corte — divergência
 * numérica silenciosa produziria alerta em um lado e silêncio no outro.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const check = (area, ok, msg) => {
  if (!ok) failures.push(`${area}: ${msg}`);
};

const query = (sql) => execFileSync('psql', ['-At', '-c', sql], { encoding: 'utf8' }).trim();

// --- 1) Política em TS ---------------------------------------------------
const src = readFileSync(new URL('../src/lib/relayRedeliveryHealth.ts', import.meta.url), 'utf8');
const num = (key) => {
  const m = src.match(new RegExp(`${key}:\\s*([0-9.]+)`));
  return m ? Number(m[1]) : NaN;
};
const policy = {
  minSamples: num('minSamples'),
  warnRate: num('warnRate'),
  criticalRate: num('criticalRate'),
  hysteresis: num('hysteresis'),
  windowHours: num('windowHours'),
};
for (const [k, v] of Object.entries(policy)) {
  check(
    'POLÍTICA',
    Number.isFinite(v),
    `constante ${k} não encontrada em relayRedeliveryHealth.ts`
  );
}
check('POLÍTICA', policy.criticalRate > policy.warnRate, 'limiar crítico deve superar o de aviso');
check(
  'POLÍTICA',
  policy.hysteresis < policy.warnRate,
  'folga de histerese maior que o limiar de aviso zeraria a saída'
);

// --- 2) Rotina SQL --------------------------------------------------------
const def = query(`
  SELECT replace(pg_get_functiondef(p.oid), E'\\n', ' ')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'evaluate_relay_redelivery'`);
check('ROTINA', def.length > 0, 'evaluate_relay_redelivery não existe');
check(
  'ROTINA',
  /SECURITY DEFINER/i.test(def) && /SET search_path/i.test(def),
  'avaliador sem blindagem (SECURITY DEFINER + search_path fixo)'
);
check(
  'ROTINA',
  /has_role\(auth\.uid\(\), 'admin'/.test(def),
  'avaliador sem guarda de administrador'
);

// Paridade de defaults
check(
  'PARIDADE',
  def.includes(`min_samples integer DEFAULT ${policy.minSamples}`),
  `min_samples do SQL não bate com ${policy.minSamples}`
);
check(
  'PARIDADE',
  def.includes(`warn_rate double precision DEFAULT ${policy.warnRate}`),
  `warn_rate do SQL não bate com ${policy.warnRate}`
);
check(
  'PARIDADE',
  def.includes(`critical_rate double precision DEFAULT ${policy.criticalRate}`),
  `critical_rate do SQL não bate com ${policy.criticalRate}`
);
check(
  'PARIDADE',
  def.includes(`hysteresis double precision DEFAULT ${policy.hysteresis}`),
  `hysteresis do SQL não bate com ${policy.hysteresis}`
);
check(
  'PARIDADE',
  def.includes(`window_hours integer DEFAULT ${policy.windowHours}`),
  `window_hours do SQL não bate com ${policy.windowHours}`
);

// --- 3) Justiça da imputação (Ondas 119/120/121) --------------------------
for (const neutral of [
  'task_expired_unfair_window',
  'task_expired_deadline',
  'backend_timeout',
  'relay_backend_abandoned',
]) {
  check(
    'JUSTIÇA',
    def.includes(neutral),
    `motivo neutro ${neutral} não é excluído da contagem — agente seria culpado por decisão nossa`
  );
}
check('JUSTIÇA', /attempts.*> 1/.test(def), 'contagem de reentrega não usa attempts > 1');

// --- 4) Piso estatístico em paridade numérica ------------------------------
const points = [
  [20, 5],
  [20, 9],
  [100, 20],
  [100, 35],
  [1000, 160],
  [50, 0],
];
const sqlValues = query(
  `SELECT string_agg(round(public.wilson_lower_bound(k, n)::numeric, 6)::text, ',' ORDER BY ord)
     FROM (VALUES ${points.map(([n, k], i) => `(${i},${n},${k})`).join(',')}) v(ord, n, k)`
)
  .split(',')
  .map(Number);

const WILSON_Z = 1.959963984540054;
const tsWilson = (k, n) => {
  if (n <= 0) return 0;
  const p = k / n,
    z2 = WILSON_Z * WILSON_Z;
  return Math.min(
    Math.max(
      (p + z2 / (2 * n) - WILSON_Z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n),
      0
    ),
    1
  );
};
points.forEach(([n, k], i) => {
  const diff = Math.abs(sqlValues[i] - tsWilson(k, n));
  check(
    'ESTATÍSTICA',
    diff < 1e-5,
    `piso de Wilson diverge em n=${n} k=${k} (sql=${sqlValues[i]}, ts=${tsWilson(k, n).toFixed(6)})`
  );
});

// --- 5) Agendamento e privilégio -------------------------------------------
// `cron.job` nem sempre é legível nesta conexão; ausência de permissão vira
// aviso, não falha — o gate não pode ficar refém do papel do sandbox.
const warnings = [];
try {
  const scheduled = query(
    `SELECT count(*) FROM cron.job WHERE jobname = 'relay-redelivery-health'`
  );
  check('AGENDA', scheduled === '1', 'cron relay-redelivery-health ausente');
} catch {
  warnings.push('Sem permissão para ler `cron.job` nesta conexão — agendamento não verificado.');
}

const anonExec = query(`
  SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'evaluate_relay_redelivery'
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))`);
check('PRIVILÉGIO', anonExec === '0', 'avaliador executável por anon/authenticated');

// --- Resultado -------------------------------------------------------------
if (failures.length) {
  console.error('❌ Saúde de reentrega comprometida:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
for (const w of warnings) console.warn(`⚠️  ${w}`);
console.log('✅ Saúde de reentrega íntegra (paridade, imputação justa, Wilson e agenda).');
