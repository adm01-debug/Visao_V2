#!/usr/bin/env node
/**
 * Gate de CI — Onda 147: roteamento de alertas de manutenção por RESPONSÁVEL.
 *
 * Este gate NÃO lê catálogo: ele EXERCITA `public.evaluate_blame_alerts()` com
 * cenários reais dentro de uma transação revertida e compara o veredito do
 * banco com o modelo de referência de `simulate-wave147-blame-routing.mjs`.
 * Migração aplicar não prova que a rotina roteia certo — só a execução prova.
 */
import { execFileSync } from 'node:child_process';
import { routeBlameAlerts, THRESHOLDS } from './simulate-wave147-blame-routing.mjs';

const failures = [];
const fail = (m) => failures.push(m);

const psql = (sql) =>
  execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' }).trim();

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/**
 * Isolamento sem DELETE. O papel do gate tem apenas SELECT/INSERT — e isso é
 * saudável: um script de checagem não deve poder apagar auditoria. Em vez de
 * limpar a tabela, deslocamos o RELÓGIO para uma janela histórica vazia e
 * inserimos as fixtures dentro dela. Tudo dentro de transação revertida.
 */
const CLOCK = `now() - interval '90 days'`;

/** Cenários nomeados: cada um existe porque já quebrou algum sistema real. */
const SCENARIOS = [
  {
    name: 'deploy-derrubou-a-funcao',
    rows: Array.from({ length: 40 }, (_, i) => ({
      blame: 'caller',
      camera_id: uuid(i % 10),
      relay_agent_id: null,
    })),
  },
  {
    name: 'tempestade-de-retentativa-uma-camera',
    rows: Array.from({ length: 25 }, () => ({ blame: 'config', camera_id: uuid(1), relay_agent_id: null })),
  },
  {
    name: 'switch-caido-8-cameras-mudas',
    rows: Array.from({ length: 8 }).flatMap((_, c) =>
      Array.from({ length: 4 }, () => ({
        blame: 'device',
        camera_id: uuid(100 + c),
        relay_agent_id: uuid(900),
      })),
    ),
  },
  {
    name: 'link-instavel-frota',
    rows: Array.from({ length: 15 }, (_, i) => ({
      blame: 'transport',
      camera_id: uuid(200 + (i % 6)),
      relay_agent_id: null,
    })),
  },
  {
    name: 'amostra-pobre-nao-acorda-ninguem',
    rows: [
      { blame: 'device', camera_id: uuid(300), relay_agent_id: null },
      { blame: 'config', camera_id: uuid(301), relay_agent_id: null },
    ],
  },
  {
    name: 'triagem-nunca-e-critica',
    rows: Array.from({ length: 30 }, (_, i) => ({
      blame: 'unknown',
      camera_id: uuid(400 + (i % 5)),
      relay_agent_id: null,
    })),
  },
  {
    name: 'nuvem-degradada',
    rows: Array.from({ length: 12 }, () => ({ blame: 'cloud', camera_id: null, relay_agent_id: null })),
  },
  {
    name: 'misto-realista',
    rows: [
      ...Array.from({ length: 5 }, () => ({ blame: 'device', camera_id: uuid(500), relay_agent_id: null })),
      ...Array.from({ length: 4 }, () => ({ blame: 'config', camera_id: uuid(501), relay_agent_id: null })),
      ...Array.from({ length: 20 }, () => ({ blame: 'caller', camera_id: uuid(502), relay_agent_id: null })),
      ...Array.from({ length: 6 }, () => ({ blame: 'cloud', camera_id: null, relay_agent_id: null })),
    ],
  },
];

const RULE = {
  device: 'R4_local_reach_proven',
  transport: 'R5_remote_path_opaque',
  config: 'R3_name_resolution',
  caller: 'R0_caller_aborted',
  cloud: 'R1_cloud_dependency',
  unknown: 'R7_unknown',
};

const literal = (v) => (v === null || v === undefined ? 'NULL' : `'${v}'`);

function runScenario(scenario) {
  const values = scenario.rows
    .map(
      (r) =>
        `('gate','GATE_ERR','cloud',${literal(r.camera_id)},${literal(r.relay_agent_id)},` +
        `'${r.blame}','${RULE[r.blame]}', ${CLOCK} - interval '5 minutes')`,
    )
    .join(',');

  const sql = `
BEGIN;
SET LOCAL lock_timeout = '5s';
${values ? `INSERT INTO public.edge_function_error_audit
  (function_name, error_code, run_from, camera_id, relay_agent_id, blame, blame_rule, created_at)
VALUES ${values};` : ''}
SELECT public.evaluate_blame_alerts(${CLOCK})::text;
ROLLBACK;`;

  const out = execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'));

  if (out.length !== 1) throw new Error(`saída inesperada da rotina: ${out.length} linha(s)`);
  return JSON.parse(out[0]);
}

// --- 1. Paridade SQL × modelo de referência --------------------------------
for (const scenario of SCENARIOS) {
  let db;
  try {
    db = runScenario(scenario);
  } catch (err) {
    fail(`${scenario.name}: rotina falhou ao executar — ${err.message}`);
    continue;
  }

  const model = routeBlameAlerts(
    scenario.rows.map((r) => ({ ...r, function_name: 'gate', run_from: 'cloud' })),
  );

  const norm = (list) =>
    [...list]
      .map((a) => `${a.routine}|${a.severity}|${a.owner}|${a.scope}|${a.cameras}`)
      .sort()
      .join('\n');

  const dbCandidates = (db.candidates ?? []).slice(0, THRESHOLDS.maxAlertsPerRun);
  if (norm(dbCandidates) !== norm(model.emitted)) {
    fail(
      `${scenario.name}: divergência SQL × modelo.\n  banco:  ${norm(dbCandidates) || '(vazio)'}\n  modelo: ${
        norm(model.emitted) || '(vazio)'
      }`,
    );
  }
  if (db.emitted !== model.emitted.length) {
    fail(`${scenario.name}: emitidos ${db.emitted}, esperado ${model.emitted.length}`);
  }
}

// --- 2. Invariantes duras diretamente no banco -----------------------------
{
  const caller = runScenario(SCENARIOS[0]);
  if (caller.emitted !== 0) fail('aborto de quem chamou virou alerta — despacho injusto');
  if ((caller.suppressed?.silent ?? 0) !== 40) fail('supressão de `caller` não contabilizada');
}
{
  const cc = runScenario(SCENARIOS[2]);
  const routines = (cc.candidates ?? []).map((c) => c.routine);
  if (!routines.some((r) => r.startsWith('blame:common-cause:')))
    fail('8 câmeras mudas sob um agente não consolidaram em causa comum');
  if (routines.some((r) => /^blame:device:[0-9a-f]/.test(r)))
    fail('causa comum não suprimiu o despacho por câmera (8 técnicos a campo)');
  if (cc.emitted > 3) fail(`enxurrada: ${cc.emitted} alertas para uma falha compartilhada`);
}
{
  const tri = runScenario(SCENARIOS[5]);
  if ((tri.candidates ?? []).some((c) => c.blame === 'unknown' && c.severity === 'critical'))
    fail('triagem (`unknown`) escalou para crítico');
}

// --- 3. Cooldown: segunda execução na mesma janela não repete --------------
{
  const values = Array.from(
    { length: 25 },
    () => `('gate','E','cloud',${literal(uuid(1))},NULL,'config','R3_name_resolution', ${CLOCK} - interval '5 minutes')`,
  ).join(',');
  const sql = `
BEGIN;
INSERT INTO public.edge_function_error_audit
  (function_name, error_code, run_from, camera_id, relay_agent_id, blame, blame_rule, created_at)
VALUES ${values};
SELECT public.evaluate_blame_alerts(${CLOCK})::text;
SELECT public.evaluate_blame_alerts(${CLOCK})::text;
SELECT count(*)::text FROM public.maintenance_alert_events WHERE routine LIKE 'blame:%' AND created_at <= ${CLOCK};
ROLLBACK;`;
  const lines = execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const runs = lines.filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
  const total = Number(lines.filter((l) => /^\d+$/.test(l)).pop());
  if (runs.length !== 2) fail('rotina não é reentrante na mesma transação');
  else {
    if (runs[0].emitted !== 1) fail('primeira execução não emitiu o alerta esperado');
    if (runs[1].emitted !== 0) fail('segunda execução repetiu o alerta (cooldown inoperante)');
    if ((runs[1].suppressed?.cooldown ?? 0) !== 1) fail('supressão por cooldown não contabilizada');
  }
  if (total !== 1) fail(`cooldown deixou ${total} alertas para a mesma causa`);
}

// --- 4. Privilégio: a rotina não pode ser chamada do cliente ---------------
for (const role of ['anon', 'authenticated']) {
  const can = psql(
    `SELECT has_function_privilege('${role}', 'public.evaluate_blame_alerts(timestamptz)', 'EXECUTE')`,
  );
  if (can !== 'f') fail(`papel \`${role}\` pode executar evaluate_blame_alerts (deveria ser negado)`);
}

// --- 5. Agendamento --------------------------------------------------------
// O papel do CI pode não enxergar o schema `cron` no ambiente gerenciado. Nesse
// caso avisamos em vez de produzir falso negativo — o agendamento continua
// garantido pela migração.
try {
  const job = psql(
    `SELECT active::text || '|' || schedule FROM cron.job WHERE jobname = 'evaluate-blame-alerts'`,
  );
  if (!job) fail('job evaluate-blame-alerts não agendado — a avaliação nunca roda');
  else if (job !== 't|*/10 * * * *') fail(`agendamento inesperado: '${job}'`);
} catch {
  console.warn('⚠️  Sem permissão para ler cron.job — verificação de agendamento pulada.');
}

if (failures.length > 0) {
  console.error(`❌ db:check:blame-routing — ${failures.length} problema(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ db:check:blame-routing — alertas nascem endereçados ao responsável certo.');
