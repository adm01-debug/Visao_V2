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
 *   - `E2E_RESET_PASSWORD=1` — opt-in explícito para reescrever a senha de um
 *     usuário existente (revoga as sessões dele; nunca com jobs paralelos)
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
 * Timeout real para os fetches do seed: sem ele, um pendurado na Admin API
 * do Supabase prende o job E2E até o timeout global da GitHub Actions.
 * Aborta após `ms` e relança com erro acionável — o setup falha rápido e
 * visível (padrão do repo: credencial declarada + seed quebrado = falha,
 * nunca hang nem skip silencioso).
 */
const SEED_FETCH_TIMEOUT_MS = 60_000;

/** Tentativas extras para 5xx/timeout. O GoTrue hiberna e devolve 504 no pico. */
const SEED_FETCH_RETRIES = 3;
const SEED_FETCH_RETRY_DELAY_MS = 4_000;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function fetchOnce(
  input: RequestInfo | URL,
  init: RequestInit,
  ms: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(
        `[e2e-setup] Timeout de ${ms}ms aguardando ${input} ` +
          `(Admin API / token não respondeu — Supabase fora do ar?).`,
        { cause: err }
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `fetchOnce` com retry em 5xx/429. O projeto Supabase do E2E hiberna e o
 * gateway devolve 504 no pico do cold start; sem retry, uma única resposta
 * transitória derruba o job inteiro com "login recusado", que aponta para
 * credencial quando o problema é disponibilidade.
 */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = SEED_FETCH_TIMEOUT_MS
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= SEED_FETCH_RETRIES; attempt++) {
    try {
      const res = await fetchOnce(input, init, ms);
      if (!isRetryableStatus(res.status) || attempt === SEED_FETCH_RETRIES) return res;
      log(
        'warn',
        `${String(input)} respondeu ${res.status} (tentativa ${attempt}/${SEED_FETCH_RETRIES}) — retry.`
      );
    } catch (err) {
      lastError = err;
      if (attempt === SEED_FETCH_RETRIES) throw err;
      log(
        'warn',
        `${String(input)} falhou (tentativa ${attempt}/${SEED_FETCH_RETRIES}): ${(err as Error).message} — retry.`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, SEED_FETCH_RETRY_DELAY_MS));
  }
  throw lastError ?? new Error('[e2e-setup] fetch esgotou as tentativas');
}

/**
 * Lista usuários filtrando por email (Admin API). Retorna o primeiro ou null.
 * Usa filtro client-side em vez de `?email=` query (não suportado em todas
 * as versões do GoTrue).
 */
async function findUserByEmail(
  supabaseUrl: string,
  serviceKey: string,
  email: string
): Promise<AdminUserResponse | null> {
  const res = await fetchWithTimeout(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, {
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
  return json.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createOrUpdateUser(
  supabaseUrl: string,
  serviceKey: string,
  email: string,
  password: string,
  options: { resetPassword?: boolean } = {}
): Promise<AdminUserResponse | null> {
  const existing = await findUserByEmail(supabaseUrl, serviceKey, email);

  if (existing) {
    // NÃO reescreve a senha por padrão: `PUT /admin/users/{id}` com `password` revoga
    // TODAS as sessões do usuário no GoTrue, e este usuário é compartilhado por jobs
    // paralelos do mesmo push. Em 26/11 um 522 do GoTrue fez o setup do qa-console cair
    // neste caminho e derrubar a sessão dos dois shards do Playwright que já estavam
    // rodando (403 em `/auth/v1/user` → app em `/auth` e páginas vazias). Sem
    // `resetPassword`, usuário existente não sofre escrita nenhuma.
    if (!options.resetPassword) {
      log('info', `Usuário ${email} já existe — senha preservada (id=${existing.id.slice(0, 8)}…)`);
      return existing;
    }
    const res = await fetchWithTimeout(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!res.ok) {
      // `ok=false` aqui inclui 5xx depois de esgotar os retries: a senha do
      // usuário NÃO é a desta run. Seguir para o login com uma senha gerada
      // acaba em `invalid_credentials`, um diagnóstico falso de credencial
      // quando a causa é o GoTrue/Admin API indisponível.
      log(
        'error',
        `Update user falhou (${res.status} ${res.statusText}) — a senha desta run não foi gravada.`
      );
      return null;
    }
    log('info', `Usuário ${email} atualizado com senha nova (id=${existing.id.slice(0, 8)}…)`);
    return (await res.json()) as AdminUserResponse;
  }

  // Cria com email já confirmado (bypass de email link em E2E)
  const res = await fetchWithTimeout(`${supabaseUrl}/auth/v1/admin/users`, {
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

/**
 * Garante que o usuário de teste tenha `admin` em `public.user_roles`.
 *
 * O trigger `on_auth_user_created` cria todo usuário novo como `viewer`.
 * Sem elevação, toda rota protegida com `minRole="manager"|"admin"` cai em
 * `/acesso-negado` — e as specs passam a medir a página de erro em vez da
 * tela real. Foi o que manteve `/settings` (minRole="admin") vermelho no axe.
 * Idempotente e via service_role (bypassa RLS).
 */
async function ensureAdminRole(
  supabaseUrl: string,
  serviceKey: string,
  userId: string
): Promise<boolean> {
  // Fail-closed: a elevacao grava `admin` de forma persistente via service_role.
  // So roda em ambiente que declarou permitir isso de forma explicita (o
  // workflow `qa-console-full`). O hard-skip por URL mais abaixo nao cobre o
  // projeto de producao (`pmzxbffnbenkmzpnbehb.supabase.co` nao contem "prod").
  if (process.env.E2E_ALLOW_ADMIN_ROLE !== '1') {
    log(
      'warn',
      'Elevacao a admin desligada (defina E2E_ALLOW_ADMIN_ROLE=1) — rotas com ' +
        'minRole cairão em /acesso-negado.'
    );
    return false;
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const filter = `user_id=eq.${userId}`;

  const current = await fetchWithTimeout(
    `${supabaseUrl}/rest/v1/user_roles?${filter}&select=role`,
    { headers }
  ).catch(() => null);
  if (current?.ok) {
    const rows = (await current.json().catch(() => [])) as { role?: string }[];
    if (rows.some((r) => r.role === 'admin')) return true;
  }

  // Remove o `viewer` criado pelo trigger e grava `admin` (UNIQUE(user_id, role)
  // não impede duas linhas, e o app escolhe a primeira — limpar evita ambiguidade).
  await fetchWithTimeout(`${supabaseUrl}/rest/v1/user_roles?${filter}`, {
    method: 'DELETE',
    headers,
  }).catch(() => null);

  const insert = await fetchWithTimeout(`${supabaseUrl}/rest/v1/user_roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify([{ user_id: userId, role: 'admin' }]),
  }).catch(() => null);

  if (insert?.ok) {
    log('info', `Papel admin garantido para user=${userId.slice(0, 8)}…`);
    return true;
  }

  log(
    'warn',
    `Não foi possível elevar ${userId.slice(0, 8)}… para admin (status=${insert?.status ?? 'erro'}) ` +
      '— rotas com minRole cairão em /acesso-negado.'
  );
  return false;
}

async function signIn(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<SignInResponse | null> {
  const res = await fetchWithTimeout(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
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
  session: SignInResponse
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
  // para essas URLs. Cobrimos dev (5173), preview (4173), o dev-server local
  // (8080) e o baseURL atual — sem o 8080 fixo, um cache criado no CI (4173)
  // não vale para uma run local e o contexto cai em /auth.
  const origins = Array.from(
    new Set(['http://localhost:5173', 'http://localhost:4173', 'http://localhost:8080', baseURL])
  ).map((origin) => ({
    origin,
    // O tour de onboarding abre sozinho 1,5s depois do primeiro `/dashboard` e o
    // overlay dele bloqueia qualquer clique por cima. O contexto do E2E e um
    // usuario que ja viu o tour, entao o marcador de dispensa vai junto da sessao.
    localStorage: [
      { name: storageKey, value },
      { name: 'visao-onboarding-v1', value: 'true' },
    ],
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
    const allItems = (parsed.origins ?? []).flatMap((o) => o.localStorage ?? []);
    const tokenItem = allItems.find((i) => i.name === expectedKey);
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
      `♻️  Reaproveitando storageState (válido por mais ${Math.floor(remaining / 60)} min).`
    );
    return true;
  } catch (err) {
    log('warn', `Cache inválido (${(err as Error).message}) — re-seed.`);
    return false;
  }
}

/**
 * Aquece o GoTrue antes do seed. Projeto Supabase dormente paga o cold start na
 * primeira chamada que toca o banco de autenticação — medido em ~36 s no CI,
 * muito acima do SEED_FETCH_TIMEOUT_MS de 15 s, o que derrubava o job E2E por
 * timeout em vez de seed quebrado.
 *
 * `/auth/v1/health` não serve de sonda: responde sem tocar o caminho do
 * `grant_type=password` e mediu 7 s enquanto o token ainda levava 18 s. A sonda
 * é o próprio endpoint de token, com credencial descartável: 400 (credencial
 * inválida) prova que o caminho do login acordou. Assim o cold start é pago com
 * orçamento próprio e o fail-fast dos fetches de seed é preservado.
 */
const AUTH_WARMUP_BUDGET_MS = 120_000;
const AUTH_WARMUP_INTERVAL_MS = 3_000;
const AUTH_WARMUP_ATTEMPT_TIMEOUT_MS = 60_000;

async function warmUpAuth(supabaseUrl: string, anonKey: string): Promise<void> {
  const deadline = Date.now() + AUTH_WARMUP_BUDGET_MS;
  let attempt = 0;
  let lastError = 'sem resposta';

  while (Date.now() < deadline) {
    attempt += 1;
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AUTH_WARMUP_ATTEMPT_TIMEOUT_MS);
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        // Credencial descartável: o objetivo é acordar o caminho, nunca autenticar.
        body: JSON.stringify({ email: 'e2e-warmup@invalid.test', password: 'warmup-probe' }),
        signal: controller.signal,
      });
      if (res.status < 500) {
        log(
          'info',
          `Auth aquecido em ${Date.now() - startedAt}ms (tentativa ${attempt}, HTTP ${res.status}).`
        );
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = (err as Error).message;
    } finally {
      clearTimeout(timer);
    }
    log(
      'warn',
      `Auth ainda acordando (tentativa ${attempt}, ${Date.now() - startedAt}ms): ${lastError}. ` +
        `Nova tentativa em ${AUTH_WARMUP_INTERVAL_MS}ms.`
    );
    await new Promise((resolve) => setTimeout(resolve, AUTH_WARMUP_INTERVAL_MS));
  }

  log(
    'warn',
    `Auth não respondeu em ${AUTH_WARMUP_BUDGET_MS}ms (${lastError}) — seguindo para o seed, ` +
      'que falhará reportando a causa exata.'
  );
}

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
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

  // ───── Cache hit: reusar storageState anterior se ainda válido ─────
  // Critério: arquivo existe + chave sb-<ref>-auth-token + expires_at > now+5min.
  // Bypass via E2E_FORCE_RESEED=1. Em CI sem cache de disco, o arquivo nunca
  // existe → seed roda 1x; em dev local, reusa entre runs até o token expirar.
  //
  // A elevação a admin vive no caminho de seed. Reusar a sessão em cache a
  // ignorava: numa máquina que já rodou como `viewer`, ligar o opt-in não tinha
  // efeito e /settings seguia caindo em /acesso-negado sem aviso. Com opt-in e
  // service key presentes o reseed é obrigatório.
  const mustReseedForAdmin = process.env.E2E_ALLOW_ADMIN_ROLE === '1' && Boolean(serviceKey);
  if (mustReseedForAdmin) {
    log(
      'info',
      'E2E_ALLOW_ADMIN_ROLE=1 — ignorando o cache de sessão para reaplicar o papel admin.'
    );
  }
  if (!mustReseedForAdmin && tryReuseStorageState(STORAGE_STATE_PATH, ref)) {
    process.env.E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL || DEFAULT_EMAIL;
    return;
  }

  const email = process.env.E2E_TEST_EMAIL || DEFAULT_EMAIL;
  let password = process.env.E2E_TEST_PASSWORD || '';

  // Se temos service key → seed completo (cria/atualiza)
  // Paga o cold start do GoTrue antes de qualquer fetch que tenha timeout curto.
  await warmUpAuth(supabaseUrl, anonKey);

  // Login-first. `PUT /auth/v1/admin/users/{id}` com senha revoga TODAS as
  // sessões do usuário no GoTrue. Os shards e o qa-console rodam em paralelo
  // contra o mesmo usuário; cada PUT derrubava a sessão dos outros jobs no meio
  // da run — as specs caíam em /auth com 401 e a suíte triplicava de duração.
  let session: SignInResponse | null = null;

  if (serviceKey) {
    if (password) {
      session = await signIn(supabaseUrl, anonKey, email, password);
      if (session) log('info', `Login de ${email} reaproveitado — usuário não foi reescrito.`);
    }
    // Login falhou nesta run (senha do secret errada ou GoTrue instável).
    // `createOrUpdateUser` não reescreve a senha de usuário existente: escrever
    // revogaria a sessão dos jobs paralelos. Usuário inexistente é criado com
    // esta senha; se existe e a credencial não confere, o erro abaixo é explícito.
    if (!session) {
      if (!password) {
        password = generatePassword();
        process.env.E2E_TEST_PASSWORD = password;
        log('info', 'E2E_TEST_PASSWORD não setada — gerada para esta run.');
      }
      const user = await createOrUpdateUser(supabaseUrl, serviceKey, email, password, {
        resetPassword: process.env.E2E_RESET_PASSWORD === '1',
      });
      if (!user) {
        // Declarado e não aplicado: o preço de seguir é ~350 testes falhando em
        // "redirecionou para /auth" por um motivo que o log já conhece.
        throw new Error(
          `[e2e-setup] Seed do usuário ${email} falhou em ${supabaseUrl} ` +
            '(detalhe no log [e2e-setup] acima). Sem o seed a senha desta run não ' +
            'existe no projeto, então toda rota autenticada falharia por credencial.'
        );
      }
      session = await signIn(supabaseUrl, anonKey, email, password);
    }
    process.env.E2E_TEST_EMAIL = email;
  } else if (!password) {
    log('warn', 'Sem SUPABASE_SERVICE_ROLE_KEY nem E2E_TEST_PASSWORD — pulando seed.');
    return;
  }

  // Login → obtém tokens
  if (!session) session = await signIn(supabaseUrl, anonKey, email, password);
  if (!session) {
    log('error', `Login com ${email} falhou. Verifique credenciais.`);
    // Credenciais declaradas no ambiente e login recusado: toda rota
    // autenticada vai falhar em `authSession` (política anti-falso-positivo).
    // Falhar aqui, uma vez e com a causa, em vez de ~100 falhas genéricas de
    // "redirecionou para /auth" depois de 20+ minutos de CI.
    if (process.env.E2E_ALLOW_AUTH_REDIRECT_SKIP !== '1') {
      throw new Error(
        `[e2e-setup] Login REST de ${email} em ${supabaseUrl} foi recusado ` +
          '(detalhe no log [e2e-setup] Login REST falhou acima). Confira se o ' +
          'usuário existe NESSE projeto Supabase, está com o e-mail confirmado e se ' +
          'E2E_TEST_PASSWORD confere — ou rode com SUPABASE_SERVICE_ROLE_KEY e ' +
          'E2E_RESET_PASSWORD=1 para o setup reescrever a senha (isso revoga as sessões ' +
          'do usuário, então nunca faça isso com jobs paralelos rodando).'
      );
    }
    return;
  }

  // Persiste storageState
  // Eleva depois do login definitivo: o fallback abaixo pode ser quem obteve
  // a sessão, e elevar só dentro do bloco `if (serviceKey)` persistia
  // storageState sem `user_roles` nesse caminho.
  // O trigger cria todo usuário como `viewer`; rotas com minRole exigem mais.
  // A elevação grava em `public.user_roles` via service_role e não toca em
  // auth, então não revoga sessão de ninguém.
  if (serviceKey) await ensureAdminRole(supabaseUrl, serviceKey, session.user.id);

  const storageKey = `sb-${ref}-auth-token`;
  const baseURL =
    (config.projects[0]?.use?.baseURL as string | undefined) || 'http://localhost:5173';
  writeStorageState(STORAGE_STATE_PATH, baseURL, storageKey, session);

  log(
    'info',
    `✅ Sessão E2E pronta para ${email} → ${STORAGE_STATE_PATH.replace(process.cwd(), '.')}`
  );
}

// Re-export para reuso em scripts standalone (npm run seed:e2e-user)
export { findUserByEmail, createOrUpdateUser, signIn, generatePassword };
export const E2E_STORAGE_STATE_PATH = STORAGE_STATE_PATH;

// Avoid unused-import warning when consumed only as default in playwright.config
void existsSync;
