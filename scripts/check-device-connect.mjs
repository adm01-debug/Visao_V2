#!/usr/bin/env node
/**
 * Onda 191 — Gate da porta pública `device-connect`.
 *
 * O que este gate prova (e por que cada prova existe):
 *  G1 — O espelho `supabase/functions/_shared/deviceEnrollment.ts` é BYTE A BYTE
 *       igual a `src/lib/devices/deviceEnrollment.ts`. Se divergirem, a porta
 *       passa a julgar por uma regra diferente da que a interface mostra.
 *  G2 — A função existe, não pede JWT de pessoa (o gravador não tem sessão) e
 *       não usa o cliente autenticado por engano.
 *  G3 — O código não loga, não devolve e não grava o segredo em claro.
 *  G4 — Toda recusa sai pela mesma porta (`deniedResponse`), sem ramo que
 *       enriqueça a resposta.
 *  G5 — No banco: a trilha aceita os eventos de autenticação, continua
 *       imutável, e `anon` não enxerga nada das duas tabelas.
 *  G6 — Exercício dinâmico em transação revertida: um aceite e uma recusa
 *       gravados pela trilha, provando que o contrato de colunas da função
 *       casa com o esquema real.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const failures = [];
const ok = (cond, label) => { if (!cond) failures.push(label); };

// ── G1 — espelho da regra ────────────────────────────────────
const appRule = readFileSync('src/lib/devices/deviceEnrollment.ts');
const edgeRule = readFileSync('supabase/functions/_shared/deviceEnrollment.ts');
ok(
  createHash('sha256').update(appRule).digest('hex') ===
    createHash('sha256').update(edgeRule).digest('hex'),
  'G1 espelho divergiu. Rode: cp src/lib/devices/deviceEnrollment.ts supabase/functions/_shared/deviceEnrollment.ts',
);

// ── G2/G3/G4 — postura do código da porta ────────────────────
const fn = readFileSync('supabase/functions/device-connect/index.ts', 'utf8');
ok(!/SUPABASE_ANON_KEY/.test(fn), 'G2 a porta usa chave anônima; deve usar apenas service role');
ok(/authenticateDevice\(/.test(fn), 'G2 a porta não usa a regra única da Onda 190');
ok(!/auth\.getUser\(/.test(fn), 'G2 a porta exige sessão de usuário (gravador não tem)');
ok(/crypto\.subtle\.digest\("SHA-256"/.test(fn), 'G3 segredo não é convertido em digest');
ok(!/console\.[a-z]+\([^)]*secret/i.test(fn), 'G3 segredo aparece em log');
ok(!/JSON\.stringify\([^)]*secret/i.test(fn), 'G3 segredo pode ser serializado na resposta');
ok(!/secret_hash:\s*presentedHash/.test(fn), 'G3 hash apresentado sendo gravado no registro');
ok(!/\.insert\([^)]*secret:/.test(fn), 'G3 segredo gravado na trilha');

const denials = fn.match(/deniedResponse\(\)/g) ?? [];
ok(denials.length >= 3, 'G4 recusas não estão centralizadas em deniedResponse()');
ok(!/status:\s*40[13]/.test(fn), 'G4 status de recusa montado à mão fora da regra');
ok(/catch \(_error\)[\s\S]*deniedResponse\(\)/.test(fn), 'G4 falha interna não cai na recusa canônica');

const shared = readFileSync('supabase/functions/_shared/deviceConnect.ts', 'utf8');
ok(/status: 401, body: \{ connected: false \}/.test(shared), 'G4 recusa canônica alterada');

// ── G5/G6 — banco ────────────────────────────────────────────
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();

const eventDef = query(`
  SELECT coalesce(string_agg(pg_get_constraintdef(oid), ' | '), '')
    FROM pg_constraint
   WHERE conrelid='public.device_registration_audit'::regclass AND conname LIKE '%event%'`);
ok(/auth_accepted/.test(eventDef) && /auth_denied/.test(eventDef),
  'G5 trilha não aceita os eventos de autenticação da porta');

const acl = query(`
  SELECT coalesce(string_agg(c.relname || ':' || a.grantee::regrole::text || ':' || a.privilege_type, ' | '), '')
    FROM pg_class c, aclexplode(c.relacl) a
   WHERE c.relname IN ('device_registrations','device_registration_audit')`);
ok(!/:anon:/.test(acl), `G5 anon tem privilégio nas tabelas de dispositivo (${acl})`);
ok(!/:authenticated:(?!SELECT)/.test(acl), `G5 authenticated escreve direto; escrita deve ser só por rotina segura (${acl})`);

const triggers = query(`
  SELECT coalesce(string_agg(tgname, ' | '), '') FROM pg_trigger
   WHERE tgrelid='public.device_registration_audit'::regclass AND NOT tgisinternal`);
ok(/trg_device_audit_immutable/.test(triggers), 'G5 trilha perdeu a imutabilidade');

// G6 — exercício dinâmico, sempre revertido: a porta grava exatamente estas
// colunas; se o esquema divergir, o insert falha aqui e não em produção.
const dynamic = execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-tA', '-c', `
BEGIN;
  SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
  CREATE TEMP TABLE _e ON COMMIT DROP AS SELECT * FROM public.enroll_device('gate-191', NULL, 24);

  INSERT INTO public.device_registration_audit
    (registration_id, device_code, user_id, event, reason, secret_version, used_grace, source_ip)
  SELECT d.id, d.device_code, d.user_id, v.event, v.reason, 1, v.grace, '203.0.113.9'::inet
    FROM public.device_registrations d, _e, (VALUES
      ('auth_accepted','ok_current',false),
      ('auth_accepted','ok_grace',true),
      ('auth_denied','bad_secret',false),
      ('auth_denied','revoked',false)) AS v(event, reason, grace)
   WHERE d.id = _e.registration_id;

  INSERT INTO public.device_registration_audit (device_code, event, reason, used_grace)
  VALUES ('QQQQQQQQ9999','auth_denied','unknown_device',false);

  SELECT 'attempts=' || (SELECT count(*) FROM public.device_registration_audit a, _e
     WHERE a.registration_id = _e.registration_id AND a.event LIKE 'auth_%');
  SELECT 'scan=' || (SELECT count(*) FROM public.device_registration_audit
     WHERE device_code = 'QQQQQQQQ9999' AND registration_id IS NULL);
  SELECT 'alive=' || (SELECT (last_seen_at IS NULL)::text
     FROM public.device_registrations d, _e WHERE d.id = _e.registration_id);
ROLLBACK;`], { encoding: 'utf8' });

const got = Object.fromEntries(
  dynamic.split('\n').map((l) => l.trim()).filter((l) => l.includes('=')).map((l) => l.split('=')),
);
ok(got.attempts === '4', `G6 trilha não aceitou as tentativas de autenticação (${got.attempts})`);
ok(got.scan === '1', 'G6 varredura de dispositivo desconhecido não fica registrada');
ok(got.alive === 'true', 'G6 registrar tentativa moveu a prova de vida por conta própria');

let mutated = false;
try {
  execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-tA', '-c', `
BEGIN;
  INSERT INTO public.device_registration_audit (device_code, event, reason, used_grace)
  VALUES ('ZZTESTE00191','auth_denied','bad_secret',false);
  UPDATE public.device_registration_audit SET reason='ok_current' WHERE device_code='ZZTESTE00191';
ROLLBACK;`], { encoding: 'utf8', stdio: 'pipe' });
  mutated = true;
} catch {
  mutated = false;
}
ok(!mutated, 'G6 trilha de autenticação pôde ser reescrita');

if (failures.length > 0) {
  console.error(`❌ Gate Onda 191 — ${failures.length} falha(s):`);
  for (const f of failures) console.error(`   • ${f}`);
  process.exit(1);
}
console.log('\n✅ Gate Onda 191 — porta de conexão por registro: todas as provas aprovadas.');
