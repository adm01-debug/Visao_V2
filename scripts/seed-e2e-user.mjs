#!/usr/bin/env node
/**
 * VISÃO - Standalone E2E user seeder
 *
 * Wrapper CLI sobre `tests/e2e/global-setup.ts` para uso fora da suíte
 * Playwright (ex.: rodar manualmente em dev local antes de testar uma rota
 * autenticada no preview).
 *
 * Uso:
 *   node scripts/seed-e2e-user.mjs
 *   E2E_TEST_EMAIL=foo@bar.com E2E_TEST_PASSWORD=Pass123! node scripts/seed-e2e-user.mjs
 *
 * Requer no env:
 *   VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY + SUPABASE_SERVICE_ROLE_KEY
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Permite importar o .ts dinamicamente via tsx/esbuild se disponíveis.
// Para máxima portabilidade, replicamos a lógica essencial aqui em JS puro.

// `--ci` (ou env `CI=true`/`E2E_SEED_STRICT=1`) bloqueia geração automática de
// senha e exige todas as vars explicitamente — evita drift entre run/CI.
const argv = new Set(process.argv.slice(2));
const isCI = argv.has('--ci') || process.env.CI === 'true' || process.env.E2E_SEED_STRICT === '1';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_TEST_EMAIL || 'e2e-bot@visao.test';
let password = process.env.E2E_TEST_PASSWORD;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error(
    '[seed-e2e] ❌ Faltam vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

if (!password) {
  if (isCI) {
    console.error(
      '[seed-e2e] ❌ Modo CI: defina E2E_TEST_PASSWORD explicitamente. Geração automática desabilitada para garantir reprodutibilidade.'
    );
    process.exit(1);
  }
  // Gera senha forte (apenas em dev local).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  password =
    'Aa1!' +
    Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  console.log(`[seed-e2e] 🔑 Senha gerada (dev local): ${password}`);
  console.log(`[seed-e2e] (exporte E2E_TEST_PASSWORD="${password}" para reuso)`);
}

console.log(`[seed-e2e] 🌱 Seedando usuário ${email}${isCI ? ' (modo CI estrito)' : ''}…`);

const headers = {
  'Content-Type': 'application/json',
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};

const list = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, { headers });
if (!list.ok) {
  console.error(`[seed-e2e] List falhou: ${list.status}`);
  process.exit(1);
}
const { users = [] } = await list.json();
const existing = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

let user;
if (existing) {
  // Só reescreve a senha quando a atual é de fato recusada: `PUT` com `password`
  // revoga TODAS as sessões do usuário no GoTrue, e outros jobs do mesmo push
  // (qa-console, shards do Playwright) já estão logados com ele.
  const probe = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email, password }),
  });
  if (probe.ok) {
    user = existing;
    console.log(
      `[seed-e2e] ✅ Usuário ${email} já existe e a senha confere — senha preservada (id=${user.id.slice(0, 8)}…)`
    );
  } else if (probe.status === 400 || probe.status === 401) {
    const upd = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!upd.ok) {
      console.error(`[seed-e2e] Update falhou: ${upd.status}`);
      process.exit(1);
    }
    user = await upd.json();
    console.log(
      `[seed-e2e] ✅ Usuário ${email} atualizado com senha nova (id=${user.id.slice(0, 8)}…)`
    );
  } else {
    // 5xx/timeout do GoTrue não prova senha errada. Escrever aqui era o que
    // derrubava a sessão dos jobs irmãos (incidente de 26/11): falha alto e não escreve.
    console.error(
      `[seed-e2e] Login de verificação respondeu ${probe.status} — não vou reescrever a senha ` +
        '(isso revogaria as sessões de outros jobs). Reexecute quando o Auth responder.'
    );
    process.exit(1);
  }
} else {
  const cre = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Bot' },
    }),
  });
  if (!cre.ok) {
    console.error(`[seed-e2e] Create falhou: ${cre.status}`);
    process.exit(1);
  }
  user = await cre.json();
  console.log(`[seed-e2e] ✅ Usuário ${email} criado (id=${user.id.slice(0, 8)}…)`);
}

// Smoke login
const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: anonKey },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) {
  console.error(`[seed-e2e] Smoke login falhou: ${login.status}`);
  process.exit(1);
}
console.log(`[seed-e2e] ✅ Smoke login OK — credenciais prontas para uso.`);

void register;
void pathToFileURL; // silence unused
