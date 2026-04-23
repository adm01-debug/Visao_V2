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

/**
 * Faz login programático via REST e cacheia o resultado.
 * Retorna `null` se credenciais ausentes ou login falhou.
 */
async function loginViaRest(): Promise<SupabaseSession | null> {
  if (cachedSession) return cachedSession;
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
  session: SupabaseSession,
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
  await context.addInitScript(
    ({ key, val }) => {
      try {
        window.localStorage.setItem(key, val);
      } catch {
        /* noop */
      }
    },
    { key: storageKey, val: value },
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
          },
          { originUrl: origin.origin, ls: items },
        );
      }
    }
    return true;
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
  context: BrowserContext,
): Promise<'ready' | 'unavailable' | 'failed'> {
  // 1. Storage state em disco
  if (await tryRestoreStorageState(context)) {
    lastStrategy = 'storage-state';
    return 'ready';
  }

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
  options: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number } = {},
): Promise<boolean> {
  const { waitUntil = 'networkidle', timeout = 30000 } = options;

  // Tenta estabelecer sessão (idempotente — usa cache)
  await ensureAuthenticatedContext(page.context());

  await page.goto(path, { waitUntil, timeout }).catch(() => {});

  if (!isAuthRedirect(page.url())) return true;

  // Redirecionou para /auth: decidir entre skip ou falha
  const allowSkip = process.env.MOBILE_NAV_CLASS_AUTH_BYPASS === '1';
  const required = process.env.E2E_AUTH_REQUIRED === '1';

  if (required && !allowSkip) {
    throw new Error(
      `[authSession] Rota ${path} redirecionou para ${page.url()} e E2E_AUTH_REQUIRED=1.\n` +
        `Configure E2E_TEST_EMAIL + E2E_TEST_PASSWORD (e VITE_SUPABASE_URL/PUBLISHABLE_KEY)\n` +
        `OU gere tests/e2e/.auth/user.json via setup global.`,
    );
  }

  test.skip(
    true,
    `[authSession] Rota ${path} requer sessão (sem credenciais E2E_TEST_* configuradas). ` +
      `Cobertura garantida pelas camadas estáticas.`,
  );
  return false;
}
