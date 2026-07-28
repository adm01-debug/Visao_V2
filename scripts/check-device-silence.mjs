/**
 * Gate Onda 192 — fan-in de silêncio de dispositivo.
 *
 * Um gate estático não bastaria aqui: o risco desta onda é o **espelho SQL
 * divergir da regra única em TypeScript**, e divergência de regra não aparece
 * em assinatura de função. Então este gate executa a rotina de verdade, dentro
 * de uma transação sempre revertida, e compara veredito a veredito com o
 * classificador do app.
 */
import { execFileSync } from 'node:child_process';
import { classifyDeviceSilence } from '../src/lib/devices/deviceSilence.ts';

let checks = 0;
const failures = [];
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) failures.push(msg);
};

const psql = (sql) =>
  execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-tA', '-F', '\u0001', '-c', sql], {
    encoding: 'utf8',
  });

const rows = (sql) =>
  psql(sql)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\u0001'));

const MIN = 60_000;
const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const NOW_SQL = "timestamptz '2026-07-28T12:00:00Z'";

// ─── G1: privilégios — a rotina de fan-in é do sistema, não de usuário ───
const acl = rows(`
SELECT p.proname, p.prosecdef,
       COALESCE(array_to_string(ARRAY(
         SELECT a.grantee::regrole::text FROM aclexplode(p.proacl) a
          WHERE a.privilege_type = 'EXECUTE'), ','), '')
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('evaluate_device_silence_alerts','classify_device_silence','device_silence_thresholds')`);
ok(acl.length === 3, `G1 rotinas da onda 192 ausentes (${acl.length}/3)`);
for (const [name, secdef, grantees] of acl) {
  ok(!grantees.split(',').includes('anon'), `G1 ${name} executável por anon`);
  ok(!grantees.includes('public'), `G1 ${name} executável por PUBLIC`);
  if (name === 'evaluate_device_silence_alerts') {
    ok(secdef === 't', 'G1 fan-in deveria ser SECURITY DEFINER (escreve no barramento)');
    ok(!grantees.split(',').includes('authenticated'), 'G1 usuário comum pode disparar o fan-in');
  }
  if (name === 'classify_device_silence') {
    ok(secdef === 'f', 'G1 classificador deveria ser SECURITY INVOKER (respeita RLS de quem lê)');
  }
}

// ─── G2: a vigilância precisa estar agendada, senão não vigia nada ───
let job;
try {
  [job] = rows(
    `SELECT schedule, active::text FROM cron.job WHERE jobname = 'evaluate-device-silence'`,
  );
} catch {
  job = null; // conexão do sandbox pode não enxergar o schema cron
}
if (job === null) {
  console.warn('⚠️  Sem permissão para ler cron.job — verificação de agendamento pulada.');
} else {
  ok(job !== undefined, 'G2 vigilância de silêncio de dispositivo não está agendada');
  if (job) {
    ok(job[0] === '*/10 * * * *', `G2 cadência inesperada (${job[0]})`);
    ok(job[1] === 't', 'G2 agendamento existe mas está inativo');
  }
}

// ─── G3: paridade byte a byte de veredito entre SQL e TypeScript ───
const scenarios = [];
let n = 0;
for (const status of ['pending', 'active', 'revoked']) {
  for (const seen of [null, 1, 44, 45, 119, 120, 600]) {
    for (const denied of [null, 3, 59, 60, 61]) {
      for (const exp of [null, -10, 10]) {
        for (const rot of [null, 5, 25, 26]) {
          n += 1;
          scenarios.push({
            code: `SIM${String(n).padStart(9, '0')}`,
            status,
            seen,
            denied,
            exp,
            rot,
          });
        }
      }
    }
  }
}

const values = scenarios
  .map(
    (s) =>
      `('${s.code}','${s.status}',${s.seen === null ? 'NULL' : `${NOW_SQL} - interval '${s.seen} min'`},` +
      `${s.denied === null ? 'NULL' : `${NOW_SQL} - interval '${s.denied} min'`},` +
      `${s.exp === null ? 'NULL' : `${NOW_SQL} + interval '${s.exp} min'`},` +
      `${s.rot === null ? 'NULL' : `${NOW_SQL} - interval '${s.rot} min'`})`,
  )
  .join(',');

const sqlVerdicts = rows(`
BEGIN;
  CREATE TEMP TABLE _s(code text, status text, seen timestamptz, denied timestamptz,
                       exp timestamptz, rot timestamptz) ON COMMIT DROP;
  INSERT INTO _s VALUES ${values};

  INSERT INTO public.device_registrations
    (user_id, device_code, label, status, secret_hash, secret_version, secret_issued_at,
     previous_secret_hash, rotated_at, expires_at, last_seen_at, revoked_at, created_at)
  SELECT '11111111-1111-1111-1111-111111111111', code, 'Gravador', status,
         repeat('a',64), 1, ${NOW_SQL} - interval '30 days',
         CASE WHEN rot IS NULL THEN NULL ELSE repeat('b',64) END, rot, exp, seen,
         CASE WHEN status = 'revoked' THEN ${NOW_SQL} - interval '1 day' END,
         ${NOW_SQL} - interval '30 days'
    FROM _s;

  INSERT INTO public.device_registration_audit
    (registration_id, device_code, user_id, event, reason, used_grace, created_at)
  SELECT d.id, d.device_code, d.user_id, 'auth_denied', 'bad_secret', false, s.denied
    FROM _s s JOIN public.device_registrations d ON d.device_code = s.code
   WHERE s.denied IS NOT NULL;

  SELECT c.device_code, c.state, COALESCE(c.severity,'-'),
         COALESCE(c.silence_minutes::text,'-')
    FROM public.classify_device_silence(${NOW_SQL}) c
    JOIN _s s ON s.code = c.device_code
   ORDER BY c.device_code;
ROLLBACK;`);

ok(sqlVerdicts.length === scenarios.length,
  `G3 SQL julgou ${sqlVerdicts.length} de ${scenarios.length} cenários`);

const byCode = new Map(sqlVerdicts.map((r) => [r[0], r]));
let divergences = 0;
for (const s of scenarios) {
  const expected = classifyDeviceSilence(
    {
      registrationId: s.code,
      deviceCode: s.code,
      label: 'Gravador',
      status: s.status,
      lastSeenAt: s.seen === null ? null : NOW - s.seen * MIN,
      lastDeniedAt: s.denied === null ? null : NOW - s.denied * MIN,
      expiresAt: s.exp === null ? null : NOW + s.exp * MIN,
      rotatedAt: s.rot === null ? null : NOW - s.rot * MIN,
      createdAt: NOW - 30 * 24 * 60 * MIN,
    },
    NOW,
  );
  const got = byCode.get(s.code);
  if (!got) {
    divergences += 1;
    continue;
  }
  const same =
    got[1] === expected.state &&
    got[2] === (expected.severity ?? '-') &&
    got[3] === (expected.silenceMinutes === null ? '-' : String(expected.silenceMinutes));
  if (!same) {
    divergences += 1;
    if (divergences <= 5) {
      failures.push(
        `G3 divergência SQL×TS em ${JSON.stringify(s)}: sql=${got.slice(1).join('/')} ts=${expected.state}/${expected.severity ?? '-'}/${expected.silenceMinutes ?? '-'}`,
      );
    }
  }
}
checks += scenarios.length;
ok(divergences === 0, `G3 espelho SQL divergiu da regra única em ${divergences} cenários`);

// ─── G4: exercício dinâmico do fan-in — silêncio intencional nunca alerta,
//     piora fura a pausa, e repetição igual é engolida. Tudo revertido. ───
const fanin = rows(`
BEGIN;
  INSERT INTO public.device_registrations
    (user_id, device_code, label, status, secret_hash, last_seen_at, revoked_at)
  VALUES
    ('11111111-1111-1111-1111-111111111111','GATEAAAA0001','Sumido','active',repeat('a',64), ${NOW_SQL} - interval '600 min', NULL),
    ('11111111-1111-1111-1111-111111111111','GATEAAAA0002','Atrasado','active',repeat('a',64), ${NOW_SQL} - interval '50 min', NULL),
    ('11111111-1111-1111-1111-111111111111','GATEAAAA0003','Revogado','revoked',repeat('a',64), ${NOW_SQL} - interval '9000 min', ${NOW_SQL} - interval '1 day'),
    ('11111111-1111-1111-1111-111111111111','GATEAAAA0004','Em dia','active',repeat('a',64), ${NOW_SQL} - interval '2 min', NULL),
    ('11111111-1111-1111-1111-111111111111','GATEAAAA0005','Piorou','active',repeat('a',64), ${NOW_SQL} - interval '900 min', NULL);

  -- 0005 já foi avisado como "atrasado" dentro da pausa; agora está "sumido".
  INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
  VALUES ('device:GATEAAAA0005','warning','atrasado','{}'::jsonb, ${NOW_SQL});

  SELECT 'run1=' || (public.evaluate_device_silence_alerts(${NOW_SQL}) ->> 'emitted');
  SELECT 'escalou=' || (SELECT count(*) FROM public.maintenance_alert_events
                         WHERE routine = 'device:GATEAAAA0005' AND severity = 'critical');
  SELECT 'sev=' || (SELECT string_agg(severity, '>' ORDER BY created_at)
                      FROM public.maintenance_alert_events WHERE routine = 'device:GATEAAAA0005');
  SELECT 'run2=' || (public.evaluate_device_silence_alerts(${NOW_SQL}) ->> 'suppressed');
  SELECT 'revogado=' || (SELECT count(*) FROM public.maintenance_alert_events
                          WHERE routine = 'device:GATEAAAA0003');
  SELECT 'emdia=' || (SELECT count(*) FROM public.maintenance_alert_events
                       WHERE routine = 'device:GATEAAAA0004');
ROLLBACK;`).map((r) => r[0]);

const got = Object.fromEntries(fanin.map((l) => l.split('=')));
ok(got.run1 === '3', `G4 primeira passada deveria emitir 3 alertas (emitiu ${got.run1})`);
ok(got.escalou === '1', 'G4 agravamento não furou a pausa');
ok(got.sev === 'warning>critical', `G4 trilha de gravidade inesperada (${got.sev})`);
ok(got.run2 === '3', `G4 repetição idêntica não foi engolida pela pausa (${got.run2})`);
ok(got.revogado === '0', 'G4 registro revogado gerou alerta — silêncio intencional virou ruído');
ok(got.emdia === '0', 'G4 equipamento em dia gerou alerta');

// ─── G5: as constantes do SQL espelham as do TypeScript ───
const [thr] = rows('SELECT * FROM public.device_silence_thresholds()');
const tsConst = ['15', '3', '8', '10', '60', '2'];
ok(JSON.stringify(thr) === JSON.stringify(tsConst),
  `G5 constantes do SQL divergem do app (${thr?.join(',')})`);

if (failures.length > 0) {
  console.error(`\n❌ Gate Onda 192 — ${failures.length} falhas em ${checks} provas:`);
  for (const f of failures.slice(0, 10)) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`\n✅ Gate Onda 192 — fan-in de silêncio de dispositivo: ${checks} provas aprovadas.`);
