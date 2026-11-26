/**
 * VISÃO - Helper E2E: estabelece sessão autenticada (quando credenciais
 * estão disponíveis) ou marca o teste como skipped de forma controlada.
 *
 * **Estratégia em camadas (do mais barato → mais robusto):**
 *
 *   1. **Storage state pré-gerado**: se `tests/e2e/.auth/user.json` existir
 *      (gerado por um setup global ou commitado em ambientes seguros), o
 *      browser context é restaurado com os cookies/localStorage da sessão.
 *
 *   2. **Login programático via Supabase REST**: se `E2E_TEST_EMAIL` +
 *      `E2E_TEST_PASSWORD` + `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
 *      estiverem no env, o helper chama `/auth/v1/token?grant_type=password`,
 *      injeta o `access_token`/`refresh_token` no localStorage da página com a
 *      chave esperada pelo `@supabase/supabase-js` (`sb-<ref>-auth-token`) e
 *      recarrega a rota. Cacheia o resultado por arquivo de teste para evitar
 *      múltiplos logins na mesma run.
 *
 *   3. **Skip controlado**: se nada acima funcionar E a rota redirecionar para
 *      `/auth`, o teste é marcado como `test.skip` com mensagem clara —
 *      cobertura garantida pelas camadas estáticas (Camada 4 do checklist).
 *
 * **Variáveis de ambiente:**
 *   - `E2E_TEST_EMAIL`           — credencial de seed (ex.: `e2e@visao.test`)
 *   - `E2E_TEST_PASSWORD`        — senha da credencial
 *   - `E2E_AUTH_REQUIRED=1`      — força FALHA (em vez de skip) quando auth
 *                                  não está disponível, útil em pipelines
 *                                  que exigem cobertura completa.
 *   - `MOBILE_NAV_CLASS_AUTH_BYPASS=1` — alias mantido para compatibilidade
 *                                  com `mobile-nav-class-presence.spec.ts`.
 *
 * **Exemplo:**
 * ```ts
 * import { gotoAuthenticated } from './helpers/authSession';
 *
 * test('rota autenticada', async ({ page }) => {
 *   const ok = await gotoAuthenticated(page, '/dashboard');
 *   if (!ok) return; // skip já foi acionado
 *   // ... asserções
 * });
 * ```
 */
import type { Page, BrowserContext } from '@playwright/test';
import { test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const STORAGE_STATE_PATH = join(process.cwd(), 'tests', 'e2e', '.auth', 'user.json');

/** Margem de seguranÃ§a antes da expiraÃ§Ã£o do token para forÃ§ar re-autenticaÃ§Ã£o. */
const TOKEN_REUSE_MARGIN_SECONDS = 5 * 60;

/** Cache de token entre testes do mesmo worker para evitar logins repetidos. */
let cachedSession: SupabaseSession | null = null;
let cachedFailure = false;

/** Estratégia de auth aplicada na última chamada de `ensureAuthenticatedContext`.
 *  Lida pelo `gotoAuthenticated` para emitir log por rota. */
type AuthStrategy = 'storage-state' | 'rest-login' | 'unavailable' | 'failed';
let lastStrategy: AuthStrategy | null = null;

/** Logger compacto e silenciável. Desativa via `E2E_AUTH_LOG=0`. */
function authLog(route: string, outcome: string, detail?: string): void {
  if (process.env.E2E_AUTH_LOG === '0') return;
  const tag = '[authSession]';
  const msg = detail
    ? `${tag} ${outcome.padEnd(16)} ${route}  — ${detail}`
    : `${tag} ${outcome.padEnd(16)} ${route}`;
  // eslint-disable-next-line no-console
  console.log(msg);
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: { id: string; email?: string };
}

/** Detecta se a URL atual é a tela de login (rota standalone). */
export function isAuthRedirect(url: string): boolean {
  return /\/(auth|login)(\?|#|$|\/)/.test(url);
}

/** Obtém o "ref" do projeto Supabase a partir da URL pública. */
function extractProjectRef(supabaseUrl: string): string | null {
  const m = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : null;
}

/** True se o token ainda não expirou (com margem de segurança). */
function sessionFresh(session: SupabaseSession): boolean {
  const expiresAt = session?.expires_at ?? 0;
  return expiresAt > 0 && expiresAt > Date.now() / 1000 + TOKEN_REUSE_MARGIN_SECONDS;
}

/**
 * Faz login programático via REST e cacheia o resultado.
 * Retorna `null` se credenciais ausentes ou login falhou.
 */
async function loginViaRest(): Promise<SupabaseSession | null> {
  // Reusa a sessÃ£o cacheada enquanto o token ainda estÃ¡ vÃ¡lido (com margem).
  if (cachedSession && sessionFresh(cachedSession)) return cachedSession;
  if (cachedSession) cachedSession = null; // expirado â€” descarta e re-autentica
  if (cachedFailure) return null;

  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!email || !password || !supabaseUrl || !anonKey) {
    cachedFailure = true;
    return null;
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      cachedFailure = true;
      // eslint-disable-next-line no-console
      console.warn(`[authSession] Login REST falhou: ${res.status} ${res.statusText}`);
      return null;
    }
    const json = (await res.json()) as SupabaseSession;
    cachedSession = json;
    return json;
  } catch (err) {
    cachedFailure = true;
    // eslint-disable-next-line no-console
    console.warn(`[authSession] Login REST exception:`, (err as Error).message);
    return null;
  }
}

/**
 * Injeta a sessão Supabase no localStorage do contexto. Deve rodar ANTES
 * do `page.goto` da rota autenticada.
 */
async function injectSessionIntoContext(
  context: BrowserContext,
  session: SupabaseSession
): Promise<boolean> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return false;
  const ref = extractProjectRef(supabaseUrl);
  if (!ref) return false;

  // Chave usada pelo @supabase/supabase-js v2 com storage padrão (localStorage).
  const storageKey = `sb-${ref}-auth-token`;
  const value = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });

  // initScript roda antes de qualquer script da página em cada navegação,
  // garantindo que o cliente Supabase encontre a sessão ao inicializar.
  // O Tour de Onboarding auto-abre 1.5s apos o primeiro render (modal com
  // overlay z-50) e intercepta todo clique no `main`. Sessao de teste ja e
  // "usuario existente", entao o tour e marcado como concluido para nao
  // bloquear a navegacao.
  await context.addInitScript(
    ({ key, val }) => {
      try {
        window.localStorage.setItem(key, val);
        window.localStorage.setItem('visao-onboarding-v1', 'true');
      } catch {
        /* noop */
      }
    },
    { key: storageKey, val: value }
  );
  return true;
}

/**
 * Restaura a sessão a partir de `storageState` em disco, se existir.
 * Retorna `true` se restaurado com sucesso.
 */
async function tryRestoreStorageState(context: BrowserContext): Promise<boolean> {
  if (!existsSync(STORAGE_STATE_PATH)) return false;
  try {
    const state = JSON.parse(readFileSync(STORAGE_STATE_PATH, 'utf8'));
    if (state.cookies) await context.addCookies(state.cookies);
    if (Array.isArray(state.origins)) {
      for (const origin of state.origins) {
        const items = origin.localStorage as { name: string; value: string }[];
        await context.addInitScript(
          ({ originUrl, ls }) => {
            if (window.location.origin !== originUrl) return;
            for (const item of ls) {
              try {
                window.localStorage.setItem(item.name, item.value);
              } catch {
                /* noop */
              }
            }
            // Ver comentario em injectSessionIntoContext: o tour bloqueia cliques.
            try {
              window.localStorage.setItem('visao-onboarding-v1', 'true');
            } catch {
              /* noop */
            }
          },
          { originUrl: origin.origin, ls: items }
        );
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Lê o access_token persistido no storageState e informa se ele ainda não
 * expirou. Sem storage state ou sem token, retorna `false`.
 */
async function storageStateFresh(): Promise<boolean> {
  try {
    if (!existsSync(STORAGE_STATE_PATH)) return false;
    const state = JSON.parse(readFileSync(STORAGE_STATE_PATH, 'utf8'));
    let expiresAt = 0;
    for (const origin of state.origins ?? []) {
      for (const item of origin.localStorage ?? []) {
        if (typeof item.value === 'string' && item.value.includes('"expires_at"')) {
          const match = item.value.match(/"expires_at"\s*:\s*(\d+)/);
          if (match) expiresAt = Math.max(expiresAt, Number(match[1]));
        }
      }
    }
    return expiresAt > Date.now() / 1000 + TOKEN_REUSE_MARGIN_SECONDS;
  } catch {
    return false;
  }
}

/**
 * Tenta autenticar o `BrowserContext` antes de qualquer navegação.
 * Retorna `'ready'` (sessão estabelecida), `'unavailable'` (sem credenciais)
 * ou `'failed'` (credenciais presentes mas login falhou).
 */
export async function ensureAuthenticatedContext(
  context: BrowserContext
): Promise<'ready' | 'unavailable' | 'failed'> {
  // 1. Storage state em disco - so usa se o access token ainda nao expirou.
  if ((await tryRestoreStorageState(context)) && (await storageStateFresh())) {
    lastStrategy = 'storage-state';
    return 'ready';
  }
  // Token expirado ou sem storage state - segue para re-autenticacao via REST.

  // 2. Login programático
  const session = await loginViaRest();
  if (!session) {
    // sem credenciais OU login falhou — distinguir para mensagens corretas
    const hasCreds = !!(process.env.E2E_TEST_EMAIL || process.env.E2E_TEST_PASSWORD);
    const outcome = cachedFailure && hasCreds ? 'failed' : 'unavailable';
    lastStrategy = outcome;
    return outcome;
  }
  const injected = await injectSessionIntoContext(context, session);
  lastStrategy = injected ? 'rest-login' : 'failed';
  return injected ? 'ready' : 'failed';
}

/** Retorna a estratégia aplicada na última chamada de `ensureAuthenticatedContext`. */
export function getLastAuthStrategy(): AuthStrategy | null {
  return lastStrategy;
}

/**
 * Helper de alto nível: navega para `path` autenticando primeiro (se possível),
 * faz skip controlado se a rota redirecionar para `/auth`. Retorna `true` se
 * o teste pode prosseguir, `false` se foi pulado/falhou.
 *
 * Comportamento:
 *   - `E2E_AUTH_REQUIRED=1` → throw em vez de skip se não autenticar
 *   - `MOBILE_NAV_CLASS_AUTH_BYPASS=1` → skip explícito (compat)
 */
export async function gotoAuthenticated(
  page: Page,
  path: string,
  options: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
    /** Gate de classe: sem `MOBILE_NAV_CLASS_AUTH_BYPASS=1`, redirect p/ /auth FALHA (contrato do gate). */
    explicitBypassRequired?: boolean;
  } = {}
): Promise<boolean> {
  const { waitUntil = 'domcontentloaded', timeout = 30000 } = options;

  // Tenta estabelecer sessão (idempotente — usa cache)
  await ensureAuthenticatedContext(page.context());
  const strategy = lastStrategy;

  await page.goto(path, { waitUntil, timeout }).catch(() => {});

  // SPA race-condition guard: React processes auth state asynchronously —
  // domcontentloaded fires before JS runs, so the URL may still be the original
  // path when we check. Wait for either the authenticated scaffold OR the auth
  // redirect to appear, whichever comes first, before deciding.
  await Promise.race([
    page.waitForURL((url) => isAuthRedirect(url.href), { timeout: 5000 }),
    page.waitForSelector('[data-app-scroll]', { state: 'visible', timeout: 5000 }),
  ]).catch(() => {
    // Timeout: no redirect or scaffold appeared — proceed with current URL check
    // (handles public pages or very slow environments)
  });

  if (!isAuthRedirect(page.url())) {
    // Sucesso: log mostra qual estratégia entregou a sessão
    if (strategy === 'storage-state') authLog(path, 'OK storage-state');
    else if (strategy === 'rest-login') authLog(path, 'OK rest-login');
    else authLog(path, 'OK anon-or-public', `strategy=${strategy ?? 'none'}`);
    return true;
  }

  // Redirecionou para /auth — decidir entre FALHA e SKIP.
  //
  // Política anti-falso-positivo:
  //   1. `E2E_AUTH_REQUIRED=1` → sempre FALHA (a menos que MOBILE_NAV_CLASS_AUTH_BYPASS=1).
  //   2. **Credenciais presentes no env** (E2E_TEST_EMAIL + E2E_TEST_PASSWORD)
  //      OU storage state em disco → FALHA. Nesse cenário o usuário sinalizou
  //      que auth deve funcionar; um redirect indica login quebrado, role
  //      insuficiente, ou rota mal protegida — todas regressões reais.
  //   3. `MOBILE_NAV_CLASS_AUTH_BYPASS=1` → SKIP explícito (compat).
  //   4. Caso contrário (sem credenciais e sem bypass) → SKIP silencioso.
  //
  // Override de emergência: `E2E_ALLOW_AUTH_REDIRECT_SKIP=1` força skip mesmo
  // com credenciais presentes — usar apenas em incidente confirmado.
  const allowSkip = process.env.MOBILE_NAV_CLASS_AUTH_BYPASS === '1';
  const required = process.env.E2E_AUTH_REQUIRED === '1';
  const escapeHatch = process.env.E2E_ALLOW_AUTH_REDIRECT_SKIP === '1';
  const gateContract = options.explicitBypassRequired === true;
  const hasCredentials =
    !!(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD) ||
    existsSync(STORAGE_STATE_PATH);

  // Distingue motivo do redirect para mensagem de erro / log
  const reason =
    strategy === 'failed'
      ? 'login-failed'
      : strategy === 'unavailable'
        ? 'no-credentials'
        : 'redirect-to-auth';

  const shouldFail = !escapeHatch && !allowSkip && (required || hasCredentials || gateContract);

  if (shouldFail) {
    authLog(path, 'FAIL redirect', `→ ${page.url()} (reason=${reason})`);
    const trigger = gateContract
      ? 'gate class-presence sem MOBILE_NAV_CLASS_AUTH_BYPASS=1'
      : required
        ? 'E2E_AUTH_REQUIRED=1'
        : 'credenciais presentes (E2E_TEST_* ou storageState)';
    throw new Error(
      `[authSession] Rota ${path} redirecionou para ${page.url()}.\n` +
        `Motivo detectado: ${reason}.\n` +
        `Falha aplicada porque ${trigger} — auth deveria estar funcionando.\n\n` +
        `Possíveis causas:\n` +
        `  • Login REST falhou (cheque logs anteriores [authSession] Login REST falhou)\n` +
        `  • Usuário não tem role mínima exigida pela rota (ProtectedRoute minRole)\n` +
        `  • Storage state expirou — re-seed via E2E_FORCE_RESEED=1 npm run test:e2e\n` +
        `  • ProtectedRoute mal configurada redirecionando usuário válido\n\n` +
        `Para skip controlado em incidente: E2E_ALLOW_AUTH_REDIRECT_SKIP=1.`
    );
  }

  authLog(path, 'SKIP', `${reason} → ${page.url()}`);

  test.skip(
    true,
    `[authSession] Rota ${path} requer sessão (motivo: ${reason}). ` +
      `Cobertura garantida pelas camadas estáticas.`
  );
  return false;
}
