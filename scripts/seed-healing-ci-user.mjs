#!/usr/bin/env node
/**
 * Onda 141 — Usuário de CI dedicado ao exercício de auto-cura.
 *
 * Por que um usuário separado do `e2e-bot`: os fixtures de cura ficam sob o
 * dono do agente (`local_agents.user_id`) e aparecem no rastro de
 * `agent_healing_actions`. Misturá-los com o usuário das jornadas E2E tornaria
 * impossível distinguir, num incidente, o que é dado de teste de cura e o que
 * é jornada de interface. Domínios de teste separados falham separadamente.
 *
 * O que este script faz:
 *   1. cria (ou atualiza) o usuário `healing-ci@visao.test` via Admin API;
 *   2. concede o papel escolhido em `public.user_roles` (padrão: `admin`,
 *      necessário para ler `agent_healing_runs`, que é restrito a admin);
 *   3. faz um login de fumaça para provar que a credencial serve.
 *
 * Salvaguardas:
 *   - o papel `admin` só é concedido a e-mails de domínio de teste
 *     (`E2E_ALLOWED_TEST_DOMAINS`, padrão `.test`). Um typo apontando para o
 *     e-mail real de um cliente não deve promovê-lo a administrador.
 *   - em CI (`--ci`) a senha precisa ser explícita: senha gerada tornaria a
 *     execução irreprodutível e o segredo, descartável.
 *
 * Uso:
 *   npm run seed:healing-ci-user
 *   npm run seed:healing-ci-user:ci
 *
 * Requer: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
 *         SUPABASE_SERVICE_ROLE_KEY e (para o papel) SUPABASE_DB_URL/psql.
 */
import { execFileSync } from 'node:child_process';

const argv = new Set(process.argv.slice(2));
const isCI = argv.has('--ci') || process.env.CI === 'true' || process.env.E2E_SEED_STRICT === '1';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = (process.env.HEALING_CI_EMAIL || 'healing-ci@visao.test').toLowerCase();
const role = process.env.HEALING_CI_ROLE || 'admin';
let password = process.env.HEALING_CI_PASSWORD;

const allowedDomains = (process.env.E2E_ALLOWED_TEST_DOMAINS || '.test,.invalid,.localhost')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const fail = (msg) => {
  console.error(`[healing-ci] ❌ ${msg}`);
  process.exit(1);
};

if (!supabaseUrl || !anonKey || !serviceKey) {
  fail('faltam vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY');
}

if (!['admin', 'manager', 'operator', 'viewer'].includes(role)) {
  fail(`papel inválido: ${role} (use admin|manager|operator|viewer)`);
}

// Salvaguarda: papel privilegiado só em domínio de teste.
const isTestDomain = allowedDomains.some((d) => email.endsWith(d));
if (!isTestDomain && (role === 'admin' || role === 'manager')) {
  fail(
    `recusando conceder '${role}' a ${email}: fora dos domínios de teste (${allowedDomains.join(', ')}). ` +
      'Ajuste E2E_ALLOWED_TEST_DOMAINS conscientemente se este for mesmo um ambiente descartável.'
  );
}

if (!password) {
  if (isCI) fail('modo CI: defina HEALING_CI_PASSWORD explicitamente (sem geração automática).');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  password =
    'Aa1!' +
    Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  console.log(`[healing-ci] 🔑 Senha gerada (dev local): ${password}`);
  console.log('[healing-ci] (exporte HEALING_CI_PASSWORD para reuso)');
}

const headers = {
  'Content-Type': 'application/json',
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};

console.log(
  `[healing-ci] 🌱 Seedando ${email} (papel ${role})${isCI ? ' — modo CI estrito' : ''}…`
);

const list = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, { headers });
if (!list.ok) fail(`listagem de usuários falhou: ${list.status}`);
const { users = [] } = await list.json();
const existing = users.find((u) => u.email?.toLowerCase() === email);

let user;
if (existing) {
  const upd = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ password, email_confirm: true }),
  });
  user = upd.ok ? await upd.json() : existing;
  console.log(`[healing-ci] ✅ Usuário atualizado (id=${user.id})`);
} else {
  const cre = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Healing CI Bot', purpose: 'heal_local_agents loop exercise' },
    }),
  });
  if (!cre.ok) fail(`criação falhou: ${cre.status} ${await cre.text()}`);
  user = await cre.json();
  console.log(`[healing-ci] ✅ Usuário criado (id=${user.id})`);
}

// Papel: `user_roles` é a única fonte de verdade de autorização (nunca o
// perfil). Idempotente pelo índice único (user_id, role).
const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
try {
  const args = [
    ...(conn ? [conn] : []),
    '-tA',
    '-X',
    '-q',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `INSERT INTO public.user_roles (user_id, role) VALUES ('${user.id}', '${role}')
     ON CONFLICT (user_id, role) DO NOTHING`,
  ];
  execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(`[healing-ci] ✅ Papel '${role}' garantido em user_roles.`);
} catch (err) {
  console.warn(
    `[healing-ci] ⚠️ Não foi possível gravar o papel via psql (${err.message.split('\n')[0]}). ` +
      'O usuário existe, mas sem papel não lerá agent_healing_runs.'
  );
}

const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: anonKey },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) fail(`login de fumaça falhou: ${login.status}`);

console.log('[healing-ci] ✅ Login de fumaça OK.');
console.log(`[healing-ci] ➜ HEALING_CI_USER_ID=${user.id}`);

if (process.env.GITHUB_ENV) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_ENV, `HEALING_CI_USER_ID=${user.id}\n`);
}
