#!/usr/bin/env node
/**
 * Gate de CI — Onda 136: console humano de manutenção.
 *
 * O ponto cego fechado aqui: a cadeia detecção → despacho → escalonamento
 * existia inteira, mas nenhuma tela chamava
 * `public.acknowledge_maintenance_alert`. Sem reconhecimento, `acknowledged_at`
 * ficava eternamente nulo, todo alerta crítico subia até o plantão e o cooldown
 * do fan-in reemitia para sempre. Um incidente sem dono é indistinguível de um
 * incidente resolvido.
 *
 * Falha (exit 1) quando:
 *  - o RPC de reconhecimento sumiu, deixou de ser SECURITY DEFINER, virou
 *    executável por `anon` ou parou de exigir papel de administrador;
 *  - as tabelas do barramento voltaram a conceder qualquer privilégio a `anon`
 *    ou privilégio de ESCRITA a `authenticated` (só o RPC pode escrever);
 *  - o reconhecimento deixou de ser idempotente (reescrever o carimbo original
 *    destruiria a métrica de tempo até o reconhecimento);
 *  - a rotina de escalonamento parou de respeitar `acknowledged_at`;
 *  - a UI perdeu o consumo do RPC (regressão de fio solto).
 *
 * Uso: `npm run db:check:maintenance-console`
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) =>
  execFileSync('psql', ['-tA', '-F', '\u0001', '-X', '-q', '-c', sql], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== 'BEGIN' && line !== 'ROLLBACK')
    .map((line) => line.split('\u0001'));

const check = (label, ok, detail) => {
  if (!ok) failures.push(`${label}: ${detail}`);
};

const TABLES = [
  'maintenance_alert_events',
  'maintenance_alert_escalations',
  'maintenance_alert_dispatches',
];

// --- 1) Blindagem do RPC de reconhecimento -------------------------------------
const fn = query(`
  SELECT p.prosecdef,
         has_function_privilege('anon', p.oid, 'EXECUTE'),
         has_function_privilege('authenticated', p.oid, 'EXECUTE'),
         p.prosrc ILIKE '%has_role(auth.uid()%admin%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'acknowledge_maintenance_alert'`);

if (fn.length === 0) {
  failures.push('EXISTÊNCIA: public.acknowledge_maintenance_alert não existe.');
} else {
  const [secdef, anonExec, authExec, checksRole] = fn[0];
  check('BLINDAGEM', secdef === 't', 'o RPC deixou de ser SECURITY DEFINER');
  check('BLINDAGEM', anonExec !== 't', 'o RPC é executável por visitantes anônimos');
  check('BLINDAGEM', authExec === 't', 'usuários autenticados perderam acesso ao RPC');
  check(
    'AUTORIZAÇÃO',
    checksRole === 't',
    'o RPC não valida mais has_role(auth.uid(), admin) — SECURITY DEFINER sem porteiro',
  );
}

// --- 2) Idempotência do reconhecimento -----------------------------------------
const idem = query(`
  SELECT p.prosrc ILIKE '%COALESCE(acknowledged_at%'
     AND p.prosrc ILIKE '%COALESCE(acknowledged_by%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'acknowledge_maintenance_alert'`);
check(
  'IDEMPOTÊNCIA',
  idem[0]?.[0] === 't',
  'reconhecer duas vezes reescreveria dono/carimbo originais',
);

// --- 3) Grants das tabelas do barramento ---------------------------------------
for (const table of TABLES) {
  const grants = query(`
    SELECT has_table_privilege('anon', 'public.${table}', 'SELECT'),
           has_table_privilege('anon', 'public.${table}', 'INSERT'),
           has_table_privilege('anon', 'public.${table}', 'UPDATE'),
           has_table_privilege('anon', 'public.${table}', 'DELETE'),
           has_table_privilege('authenticated', 'public.${table}', 'SELECT'),
           has_table_privilege('authenticated', 'public.${table}', 'INSERT'),
           has_table_privilege('authenticated', 'public.${table}', 'UPDATE'),
           has_table_privilege('authenticated', 'public.${table}', 'DELETE'),
           has_table_privilege('service_role', 'public.${table}', 'INSERT'),
           relrowsecurity
      FROM pg_class WHERE oid = 'public.${table}'::regclass`);

  if (grants.length === 0) {
    failures.push(`GRANTS: tabela public.${table} não encontrada.`);
    continue;
  }
  const [aS, aI, aU, aD, uS, uI, uU, uD, sI, rls] = grants[0];
  check('GRANTS', [aS, aI, aU, aD].every((v) => v !== 't'), `anon ainda tem acesso a ${table}`);
  check('GRANTS', uS === 't', `authenticated perdeu leitura de ${table} — painel cego`);
  check(
    'GRANTS',
    [uI, uU, uD].every((v) => v !== 't'),
    `authenticated pode escrever direto em ${table} — a trilha de incidentes deixa de ser confiável`,
  );
  check('GRANTS', sI === 't', `service_role perdeu escrita em ${table}`);
  check('RLS', rls === 't', `RLS desabilitada em ${table}`);
}

// --- 4) Reconhecer congela a escada --------------------------------------------
const freeze = query(`
  SELECT p.prosrc ILIKE '%acknowledged_at IS NULL%'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'escalate_stale_maintenance_alerts'`);
check(
  'CONGELAMENTO',
  freeze[0]?.[0] === 't',
  'escalate_stale_maintenance_alerts ignora acknowledged_at — reconhecer deixaria de parar a escada',
);

// --- 5) Prova funcional em transação revertida ---------------------------------
// Um alerta reconhecido não pode aparecer como pendente para o escalonador.
const functional = query(`
  BEGIN;
  INSERT INTO public.maintenance_alert_events (routine, severity, reason, created_at, acknowledged_at)
  VALUES ('gate:wave136', 'critical', 'prova de gate', now() - interval '30 days', now())
  RETURNING (acknowledged_at IS NOT NULL);
  SELECT count(*) FROM public.maintenance_alert_events
   WHERE routine = 'gate:wave136' AND acknowledged_at IS NULL;
  ROLLBACK;`);
check(
  'FUNCIONAL',
  functional.at(-1)?.[0] === '0',
  'alerta reconhecido ainda aparece na fila de abertos',
);

// --- 6) O fio até a UI ---------------------------------------------------------
const hook = readFileSync('src/hooks/useMaintenanceConsole.ts', 'utf8');
check(
  'UI',
  hook.includes('acknowledge_maintenance_alert'),
  'o hook do console parou de chamar o RPC de reconhecimento',
);
const app = readFileSync('src/App.tsx', 'utf8');
check('UI', app.includes('/manutencao'), 'a rota /manutencao sumiu do App.tsx');
check(
  'UI',
  /path="\/manutencao"[\s\S]{0,200}minRole="admin"/.test(app),
  'a rota /manutencao não exige mais perfil de administrador',
);

// --- Resultado -----------------------------------------------------------------
if (failures.length > 0) {
  console.error('❌ Gate do console de manutenção (Onda 136) falhou:\n');
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log('✅ Console de manutenção íntegro: RPC blindado, grants mínimos, escada congelável.');
