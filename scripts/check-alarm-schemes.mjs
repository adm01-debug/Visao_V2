#!/usr/bin/env node
/**
 * Gate de CI — Onda 219: cadastro de esquemas de alarme (`public.alarm_schemes`).
 *
 * O que este gate prova, e por que cada parte existe:
 *
 *  1. **ACL pelo catálogo, não pelo `information_schema`.** Privilégio se lê em
 *     `pg_class.relacl` + `aclexplode`: `role_table_grants` só mostra o que o
 *     papel corrente enxerga, devolve vazio e aprova gate cego (Onda 184).
 *     `anon` não pode ter nenhum privilégio — a tabela revela o desenho de
 *     segurança do site.
 *  2. **RLS ligada com política de dono.** Sem isso, o GRANT a `authenticated`
 *     abriria o cadastro de todo mundo para qualquer usuário logado.
 *  3. **As 6 guardas existem E executam.** Gate estático não substitui
 *     execução: a Onda 141 achou uma rotina abortando em silêncio há várias
 *     ondas. O exercício roda em transação revertida via
 *     `alarm_scheme_selftest()`.
 *  4. **Paridade de constantes TS ↔ SQL.** Teto de canais, tamanho do nome,
 *     faixa do limiar e o catálogo de 21 eventos precisam ser os mesmos nos
 *     dois lados; se divergirem, a UI aprova o que o banco recusa (ou pior:
 *     o inverso).
 *  5. **Regra única na UI.** O formulário da Onda 218 não pode reimplementar o
 *     julgamento — precisa chamar `diagnoseScheme` e contar canais como o
 *     banco conta.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, cond, detail) => {
  if (!cond) failures.push(`${label}: ${detail}`);
};

const TABLE = 'alarm_schemes';
const schemeSrc = readFileSync(new URL('../src/lib/alarms/alarmScheme.ts', import.meta.url), 'utf8');
const formSrc = readFileSync(
  new URL('../src/lib/alarms/alarmSchemeForm.ts', import.meta.url),
  'utf8',
);
// Onda 222 — a agenda semanal (S8) tem régua própria no TS e espelho no banco.
// As constantes moram em `alarmAggregation.ts` (fonte única); o formulário só
// as reexporta, então o gate lê a origem para não validar contra um apelido.
const scheduleSrc = readFileSync(
  new URL('../src/lib/alarms/alarmScheduleForm.ts', import.meta.url),
  'utf8',
);
const aggregationSrc = readFileSync(
  new URL('../src/lib/alarms/alarmAggregation.ts', import.meta.url),
  'utf8',
);

/* -- 1) ACL ------------------------------------------------------------- */

const acl = query(`
  SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text || ':' || a.privilege_type, ',' ORDER BY a.grantee::regrole::text || ':' || a.privilege_type), '')
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE n.nspname = 'public' AND c.relname = '${TABLE}'`);

check('ACL', acl !== '', `${TABLE} sem ACL legível (tabela existe?)`);
check('ACL', !/(^|,)anon:/.test(acl), `anon tem privilégio em ${TABLE} (${acl})`);
check('ACL', !/(^|,)-:/.test(acl), `PUBLIC tem privilégio em ${TABLE} (${acl})`);
for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
  check('ACL', acl.includes(`authenticated:${priv}`), `authenticated sem ${priv} em ${TABLE}`);
}
check('ACL', acl.includes('service_role:SELECT'), `service_role sem acesso em ${TABLE}`);

/* -- 2) RLS ------------------------------------------------------------- */

const rls = query(`
  SELECT c.relrowsecurity::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relname='${TABLE}'`);
check('RLS', rls === 'true', `${TABLE} sem row level security`);

const policies = query(`
  SELECT COALESCE(string_agg(polname || '|' || pg_get_expr(polqual, polrelid), ' ;; '), '')
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relname='${TABLE}'`);
check('RLS', /auth\.uid\(\)\s*=\s*user_id|user_id\s*=\s*auth\.uid\(\)/.test(policies),
  `${TABLE} sem política de dono (${policies || 'nenhuma política'})`);
check('RLS', /has_role\(/.test(policies), `${TABLE} sem trilha de auditoria para admin`);

/* -- 3) Guardas declaradas --------------------------------------------- */

const constraints = query(`
  SELECT COALESCE(string_agg(conname, ','), '') FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relname='${TABLE}' AND con.contype='c'`);
for (const name of [
  'alarm_schemes_name_useful',
  'alarm_schemes_event_type_catalog',
  'alarm_schemes_disconnect_range',
  'alarm_schemes_actions_is_array',
]) {
  check('GUARDA', constraints.includes(name), `CHECK ausente: ${name} (${constraints})`);
}

const trigger = query(`
  SELECT COALESCE(string_agg(tgname, ','), '') FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relname='${TABLE}' AND NOT t.tgisinternal`);
check('GUARDA', trigger.includes('alarm_schemes_enforce_rules'), `trigger ausente (${trigger})`);

const fnMeta = query(`
  SELECT COALESCE(string_agg(p.proname || ':' || COALESCE(array_to_string(p.proconfig, ' '), 'sem-config'), ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public'
     AND p.proname IN ('alarm_scheme_channel_total','enforce_alarm_scheme_rules',
                       'alarm_scheme_selftest','alarm_schedule_refusal','alarm_schedule_selftest')`);
for (const fn of [
  'alarm_scheme_channel_total',
  'enforce_alarm_scheme_rules',
  'alarm_scheme_selftest',
  'alarm_schedule_refusal',
  'alarm_schedule_selftest',
]) {
  check('GUARDA', fnMeta.includes(`${fn}:`), `rotina ausente: ${fn}`);
  check('GUARDA', new RegExp(`${fn}:[^,]*search_path=`).test(fnMeta), `${fn} sem search_path fixo`);
}

const selftestAcl = query(`
  SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
   WHERE n.nspname='public' AND p.proname IN ('alarm_scheme_selftest','alarm_schedule_selftest')
     AND a.grantee::regrole::text IN ('anon','authenticated','-')`);
check('GUARDA', selftestAcl === '', `rotina de autoteste alcançável por (${selftestAcl})`);

// `alarm_schedule_refusal` é lida pelo gatilho; anon jamais precisa dela.
const refusalAcl = query(`
  SELECT COALESCE(string_agg(DISTINCT a.grantee::regrole::text, ','), '')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
   WHERE n.nspname='public' AND p.proname='alarm_schedule_refusal'
     AND a.grantee::regrole::text IN ('anon','-')`);
check('GUARDA', refusalAcl === '', `alarm_schedule_refusal alcançável por (${refusalAcl})`);

// O gatilho precisa realmente consultar a régua de agenda: função existir sem
// ser chamada é o mesmo que não existir.
const trigCallsSchedule = query(`SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='enforce_alarm_scheme_rules'`);
check(
  'GUARDA',
  trigCallsSchedule.includes('alarm_schedule_refusal'),
  'o gatilho não consulta alarm_schedule_refusal — a agenda entraria sem julgamento',
);

/* -- 4) Paridade TS ↔ SQL ---------------------------------------------- */

const tsMax = Number(/MAX_EVENT_CHANNELS\s*=\s*(\d+)/.exec(schemeSrc)?.[1]);
const tsName = Number(/MAX_SCHEME_NAME_LENGTH\s*=\s*(\d+)/.exec(schemeSrc)?.[1]);
const tsMin = Number(/DISCONNECT_THRESHOLD_MIN_S\s*=\s*(\d+)/.exec(schemeSrc)?.[1]);
const tsMaxS = Number(/DISCONNECT_THRESHOLD_MAX_S\s*=\s*(\d+)/.exec(schemeSrc)?.[1]);

const trigSrc = query(`SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='enforce_alarm_scheme_rules'`);
const sqlMax = Number(/v_total\s*>\s*(\d+)/.exec(trigSrc)?.[1]);
check('PARIDADE', sqlMax === tsMax, `teto de canais SQL=${sqlMax} TS=${tsMax}`);

const nameDef = query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conname='alarm_schemes_name_useful'`);
check('PARIDADE', nameDef.includes(String(tsName)), `tamanho do nome SQL=(${nameDef}) TS=${tsName}`);

const rangeDef = query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conname='alarm_schemes_disconnect_range'`);
check(
  'PARIDADE',
  rangeDef.includes(String(tsMin)) && rangeDef.includes(String(tsMaxS)),
  `faixa do limiar SQL=(${rangeDef}) TS=${tsMin}..${tsMaxS}`,
);

// Agenda (Onda 222): teto de períodos e eixo do dia precisam bater.
const tsPeriods = Number(/MAX_PERIODS_PER_DAY\s*=\s*(\d+)/.exec(aggregationSrc)?.[1]);
const tsMinutes = Number(/MINUTES_PER_DAY\s*=\s*(\d+)/.exec(aggregationSrc)?.[1]);
check('PARIDADE', /diagnoseScheduleForm/.test(scheduleSrc), 'régua de agenda ausente no TS');
const schedSrc = query(`SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='alarm_schedule_refusal'`);
const sqlPeriods = Number(/v_count\s*>\s*(\d+)/.exec(schedSrc)?.[1]);
check('PARIDADE', sqlPeriods === tsPeriods, `períodos/dia SQL=${sqlPeriods} TS=${tsPeriods}`);
check(
  'PARIDADE',
  tsMinutes === 1440 && schedSrc.includes('1440'),
  `eixo do dia SQL/TS divergente (TS=${tsMinutes})`,
);
check('PARIDADE', /7 dias/.test(schedSrc), 'o espelho SQL não exige os 7 dias da semana');

// Catálogo: os 21 tipos do TS precisam estar no CHECK, e vice-versa.
const catalogDef = query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conname='alarm_schemes_event_type_catalog'`);
const tsTypes = [...schemeSrc.matchAll(/\{\s*type:\s*'([a-z_]+)'/g)].map((m) => m[1]);
check('PARIDADE', tsTypes.length === 21, `catálogo TS tem ${tsTypes.length} tipos, esperado 21`);
for (const type of tsTypes) {
  check('PARIDADE', catalogDef.includes(`'${type}'`), `tipo ${type} existe no TS mas não no CHECK`);
}
const sqlTypes = [...catalogDef.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
for (const type of sqlTypes) {
  check('PARIDADE', tsTypes.includes(type), `tipo ${type} existe no CHECK mas não no catálogo TS`);
}

/* -- 5) Regra única na UI ---------------------------------------------- */

check(
  'REGRA-ÚNICA',
  /diagnoseScheme/.test(formSrc),
  'o formulário julga por conta própria em vez de chamar diagnoseScheme',
);
check(
  'REGRA-ÚNICA',
  /storedChannelTotal/.test(formSrc),
  'o formulário não espelha a contagem de canais do banco — o INSERT vai falhar com erro cru',
);
check(
  'REGRA-ÚNICA',
  !/health\s*[:=]\s*'inoperative'/.test(formSrc),
  'o formulário decide saúde localmente e divergirá da régua oficial',
);

/* -- 6) Exercício dinâmico (transação revertida) ------------------------ */

const raw = query(`
BEGIN;
  SET LOCAL client_min_messages = warning;
  SELECT case_name || '=' || CASE WHEN outcome = 'ACEITOU' THEN 'ACEITOU' ELSE 'RECUSOU' END
    FROM public.alarm_scheme_selftest();
ROLLBACK;`);
const results = Object.fromEntries(
  raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('='))
    .map((l) => l.split('=')),
);

const mustRefuse = [
  ['name_blank', 'nome em branco'],
  ['name_too_long', 'nome acima de 120'],
  ['unknown_event_type', 'tipo fora do catálogo'],
  ['threshold_out_of_range', 'limiar fora de 30..3600'],
  ['actions_not_array', 'ações fora do formato de lista'],
  ['channel_budget_exceeded', 'teto de 36 canais'],
  ['face_library_missing', 'face reconhecida sem biblioteca'],
  ['face_library_ambiguous', 'face reconhecida com duas bibliotecas'],
  ['update_budget_guard', 'teto de canais na alteração'],
];

/* Onda 222 — guardas de agenda, exercitadas em transação revertida. */
const rawSchedule = query(`
BEGIN;
  SET LOCAL client_min_messages = warning;
  SELECT case_name || '=' || CASE WHEN outcome = 'ACEITOU' THEN 'ACEITOU' ELSE 'RECUSOU' END
    FROM public.alarm_schedule_selftest();
ROLLBACK;`);
const scheduleResults = Object.fromEntries(
  rawSchedule
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('='))
    .map((l) => l.split('=')),
);
const scheduleMustRefuse = [
  ['schedule_wrong_day_count', 'agenda sem os 7 dias'],
  ['schedule_too_many_periods', 'sétimo período no dia'],
  ['schedule_degenerate_period', 'período de duração zero'],
  ['schedule_overlap', 'períodos sobrepostos'],
  ['schedule_overlap_midnight', 'sobreposição ao cruzar a meia-noite'],
  ['schedule_out_of_day', 'minuto fora do eixo do dia'],
  ['schedule_malformed_period', 'período malformado'],
  ['schedule_update_guard', 'agenda inválida na alteração'],
];
for (const [key, label] of scheduleMustRefuse) {
  check(
    'EXECUÇÃO',
    scheduleResults[key] === 'RECUSOU',
    `guarda de agenda não barrou ${label} (${scheduleResults[key] ?? 'sem resultado'})`,
  );
}
// Contraprovas: a régua de agenda não pode ter virado veto geral.
for (const [key, label] of [
  ['schedule_null_always_on', 'agenda vazia (24×7)'],
  ['schedule_cross_midnight_ok', 'janela que cruza a meia-noite'],
  ['schedule_touching_ok', 'períodos que apenas se encostam'],
]) {
  check('EXECUÇÃO', scheduleResults[key] === 'ACEITOU', `${label} foi recusada — régua cega`);
}

// Regra única: o formulário precisa julgar a agenda pela mesma régua.
check(
  'REGRA-ÚNICA',
  /diagnoseScheduleForm/.test(formSrc),
  'o formulário não submete a agenda a diagnoseScheduleForm',
);
for (const [key, label] of mustRefuse) {
  check('EXECUÇÃO', results[key] === 'RECUSOU', `guarda não barrou ${label} (${results[key] ?? 'sem resultado'})`);
}
// Contraprova: as guardas não podem estar recusando tudo.
check('EXECUÇÃO', results.happy_path === 'ACEITOU', 'cadastro válido foi recusado — guardas cegas');
check(
  'EXECUÇÃO',
  results.channel_budget_boundary_36 === 'ACEITOU',
  'a fronteira exata de 36 canais foi recusada — o teto virou veto',
);

/* -- Veredito ----------------------------------------------------------- */

if (failures.length === 0) {
  console.log(
    `✓ alarm-schemes OK — ACL, RLS, ${mustRefuse.length + scheduleMustRefuse.length} guardas exercidas ` +
      `+ 5 contraprovas, paridade de ${tsTypes.length} tipos e da agenda semanal`,
  );
  process.exit(0);
}
console.log('✗ Gate alarm-schemes falhou\n');
for (const f of failures) console.log(`  ${f}`);
console.log(`\nTotal: ${failures.length} problema(s).`);
process.exit(1);
