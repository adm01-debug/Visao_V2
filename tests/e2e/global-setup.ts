/**
 * VISÃO - Playwright Global Setup
 *
 * Executa **uma vez** antes de toda a suíte E2E. Responsabilidades:
 *
 *   1. **Seed do usuário de teste** — usa `SUPABASE_SERVICE_ROLE_KEY` (apenas
 *      em ambiente CI/dev seguro) para criar/garantir um usuário com email
 *      auto-confirmado via Admin API. Idempotente: se o usuário já existir,
 *      apenas atualiza a senha para garantir que bate com o env atual.
 *
 *   2. **Login programático via REST** — usa `grant_type=password` para obter
 *      `access_token`/`refresh_token` válidos e persiste no `storageState`
 *      em `tests/e2e/.auth/user.json` (formato Playwright completo: cookies +
 *      origins.localStorage com chave `sb-<ref>-auth-token`).
 *
 *   3. **Skip silencioso** — se `SUPABASE_SERVICE_ROLE_KEY` ausente E não
 *      houver `E2E_TEST_*` configurado, pula o setup sem falhar (testes
 *      cairão no skip controlado de `authSession.ts`).
 *
 * Variáveis de ambiente usadas:
 *   - `VITE_SUPABASE_URL` (ou `SUPABASE_URL`)
 *   - `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`)
 *   - `SUPABASE_SERVICE_ROLE_KEY` — necessária para seed admin
 *   - `E2E_TEST_EMAIL` (default: `e2e-bot@visao.test`)
 *   - `E2E_TEST_PASSWORD` (default: gerada aleatoriamente — sobrescreve env
 *     em `process.env` para os workers herdarem)
 *
 * **Segurança:** este setup NUNCA deve rodar em produção. A service key fica
 * apenas no ambiente CI (GitHub Secret). O storageState em disco não é
 * commitado (`.auth/` está no `.gitignore`).
 */
import type { FullConfig } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const STORAGE_STATE_PATH = join(process.cwd(), 'tests', 'e2e', '.auth', 'user.json');
const DEFAULT_EMAIL = 'e2e-bot@visao.test';
/** Margem (s) — só reusa o storage state se o token ainda durar > 5 min. */
const TOKEN_REUSE_MARGIN_SECONDS = 5 * 60;
/** Bypass de cache: `E2E_FORCE_RESEED=1` quando precisa rotacionar credenciais. */
const FORCE_RESEED = process.env.E2E_FORCE_RESEED === '1';

interface AdminUserResponse {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
}

interface SignInResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: { id: string; email?: string };
}

function extractRef(url: string): string | null {
  const m = url.match(/^https?:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : null;
}

function log(level: 'info' | 'warn' | 'error', msg: string) {
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](`[e2e-setup] ${msg}`);
}

/**
 * Lista usuários filtrando por email (Admin API). Retorna o primeiro ou null.
 * Usa filtro client-side em vez de `?email=` query (não suportado em todas
 * as versões do GoTrue).
 */
async function findUserByEmail(
  supabaseUrl: string,
  serviceKey: string,
  email: string,
): Promise<AdminUserResponse | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) {
    log('warn', `Admin list users falhou: ${res.status} ${res.statusText}`);
    return null;
  }
  const json = (await res.json()) as { users?: AdminUserResponse[] };
  return json.users?.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createOrUpdateUser(
  supabaseUrl: string,
  serviceKey: string,
  email: string,
  password: string,
): Promise<AdminUserResponse | null> {
  const existing = await findUserByEmail(supabaseUrl, serviceKey, email);

  if (existing) {
    // Atualiza a senha (idempotente — garante login funciona com env atual)
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!res.ok) {
      log('warn', `Update user falhou: ${res.status} ${res.statusText}`);
      return existing; // mesmo assim, tentamos login com a senha existente
    }
    log('info', `Usuário ${email} atualizado (id=${existing.id.slice(0, 8)}…)`);
    return (await res.json()) as AdminUserResponse;
  }

  // Cria com email já confirmado (bypass de email link em E2E)
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Bot' },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    log('error', `Create user falhou: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
    return null;
  }
  const created = (await res.json()) as AdminUserResponse;
  log('info', `Usuário ${email} criado (id=${created.id.slice(0, 8)}…)`);
  return created;
}

async function signIn(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<SignInResponse | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    log('error', `Login REST falhou: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
    return null;
  }
  return (await res.json()) as SignInResponse;
}

/**
 * Persiste session no formato `storageState` do Playwright. O contexto será
 * inicializado com este state, que injeta a chave correta no localStorage
 * de qualquer origem que casar (nós usamos `*` como origin → injetado em
 * qualquer URL). Ver: https://playwright.dev/docs/auth#reusing-signed-in-state
 */
function writeStorageState(
  storageStatePath: string,
  baseURL: string,
  storageKey: string,
  session: SignInResponse,
) {
  mkdirSync(dirname(storageStatePath), { recursive: true });
  const value = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
  // Origins onde o localStorage será populado quando o contexto navegar
  // para essas URLs. Cobrimos dev (5173), preview (4173) e o baseURL atual.
  const origins = Array.from(
    new Set(['http://localhost:5173', 'http://localhost:4173', baseURL]),
  ).map(origin => ({
    origin,
    localStorage: [{ name: storageKey, value }],
  }));

  const state = { cookies: [], origins };
  writeStorageState_safeWrite(storageStatePath, state);
}

function writeStorageState_safeWrite(path: string, state: unknown) {
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Gera senha aleatória robusta (atende policy: 12+ chars, mistura de cases +
 * dígito + símbolo). Persistida em `process.env.E2E_TEST_PASSWORD` para que
 * `authSession.ts` (workers) reuse a mesma credencial sem precisar reler o
 * storageState.
 */
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let out = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 12; i++) out += pick(all);
  return out;
}

/**
 * Tenta reutilizar `user.json` existente sem fazer novo login.
 * Retorna true se o token ainda é válido (> margem) e o storage está bem-formado.
 *
 * Critérios de invalidação (re-seed obrigatório):
 *   - `E2E_FORCE_RESEED=1` no env
 *   - Arquivo inexistente, JSON inválido, sem `origins` ou sem `localStorage`
 *   - Nenhum origin contém a chave `sb-<ref>-auth-token`
 *   - `expires_at` ausente, no passado, ou expira em < 5 min
 */
function tryReuseStorageState(storageStatePath: string, ref: string): boolean {
  if (FORCE_RESEED) {
    log('info', 'E2E_FORCE_RESEED=1 — ignorando cache.');
    return false;
  }
  if (!existsSync(storageStatePath)) return false;

  try {
    const raw = readFileSync(storageStatePath, 'utf8');
    const parsed = JSON.parse(raw) as {
      origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }>;
    };
    const expectedKey = `sb-${ref}-auth-token`;
    const allItems = (parsed.origins ?? []).flatMap(o => o.localStorage ?? []);
    const tokenItem = allItems.find(i => i.name === expectedKey);
    if (!tokenItem) return false;

    const session = JSON.parse(tokenItem.value) as { expires_at?: number };
    if (!session.expires_at) return false;

    const nowSec = Math.floor(Date.now() / 1000);
    const remaining = session.expires_at - nowSec;
    if (remaining < TOKEN_REUSE_MARGIN_SECONDS) {
      log('info', `Token expira em ${remaining}s (< margem) — re-seed.`);
      return false;
    }

    log(
      'info',
      `♻️  Reaproveitando storageState (válido por mais ${Math.floor(remaining / 60)} min).`,
    );
    return true;
  } catch (err) {
    log('warn', `Cache inválido (${(err as Error).message}) — re-seed.`);
    return false;
  }
}

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!supabaseUrl || !anonKey) {
    log('warn', 'VITE_SUPABASE_URL/PUBLISHABLE_KEY ausentes — pulando seed.');
    return;
  }

  // Hard-skip em produção (defesa extra, embora CI nunca rode contra prod)
  if (/\.lovable\.app/.test(supabaseUrl) === false && supabaseUrl.includes('prod')) {
    log('error', 'Recusando rodar seed E2E contra URL de produção.');
    return;
  }

  const ref = extractRef(supabaseUrl);
  if (!ref) {
    log('warn', `Não foi possível extrair project ref de ${supabaseUrl}`);
    return;
  }

  const email = process.env.E2E_TEST_EMAIL || DEFAULT_EMAIL;
  let password = process.env.E2E_TEST_PASSWORD || '';

  // Se temos service key → seed completo (cria/atualiza)
  if (serviceKey) {
    if (!password) {
      password = generatePassword();
      process.env.E2E_TEST_PASSWORD = password;
      log('info', 'E2E_TEST_PASSWORD não setada — gerada para esta run.');
    }
    const user = await createOrUpdateUser(supabaseUrl, serviceKey, email, password);
    if (!user) {
      log('error', 'Seed do usuário falhou. Testes autenticados serão skipped.');
      return;
    }
    process.env.E2E_TEST_EMAIL = email;
  } else if (!password) {
    log('warn', 'Sem SUPABASE_SERVICE_ROLE_KEY nem E2E_TEST_PASSWORD — pulando seed.');
    return;
  }

  // Login → obtém tokens
  const session = await signIn(supabaseUrl, anonKey, email, password);
  if (!session) {
    log('error', `Login com ${email} falhou. Verifique credenciais.`);
    return;
  }

  // Persiste storageState
  const storageKey = `sb-${ref}-auth-token`;
  const baseURL =
    (config.projects[0]?.use?.baseURL as string | undefined) ||
    'http://localhost:5173';
  writeStorageState(STORAGE_STATE_PATH, baseURL, storageKey, session);

  log(
    'info',
    `✅ Sessão E2E pronta para ${email} → ${STORAGE_STATE_PATH.replace(process.cwd(), '.')}`,
  );
}

// Re-export para reuso em scripts standalone (npm run seed:e2e-user)
export { findUserByEmail, createOrUpdateUser, signIn, generatePassword };
export const E2E_STORAGE_STATE_PATH = STORAGE_STATE_PATH;

// Avoid unused-import warning when consumed only as default in playwright.config
void existsSync;
