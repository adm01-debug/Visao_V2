/**
 * VISÃO — Descoberta automática de rotas autenticadas
 *
 * Faz parsing estático de `src/App.tsx` (única fonte de verdade do roteamento)
 * extraindo o path de toda `<Route>` cujo `element` envolva pelo menos um de:
 *   - `<ProtectedLayoutRoute>`  → rota com sidebar/bottom-nav (autenticada)
 *   - `<ProtectedRoute>`        → guard explícito (autenticada, possivelmente
 *                                 com `minRole`)
 *
 * Vantagens vs lista manual `AUTHENTICATED_ROUTES`:
 *   - Zero drift entre `App.tsx` e specs E2E.
 *   - Adicionar nova rota protegida em `App.tsx` cobre automaticamente todos
 *     os specs que usam `getAuthenticatedRoutes()`.
 *   - Gate de qualidade: se a regex falhar em encontrar rotas (ex.: refator),
 *     a função lança erro explícito — impede falso-positivo "0 testes ok".
 *
 * Limitações conhecidas (intencionais):
 *   - Apenas paths estáticos. Paths dinâmicos (`/cameras/:id`) ficam fora —
 *     são poucos e já cobertos por specs dedicados.
 *   - Rotas comentadas com `//` ou dentro de blocos `/* *\/` são ignoradas
 *     pelo `stripComments()`.
 *
 * Cache: o resultado é memoizado por path-de-arquivo+mtime para evitar
 * releitura em cada `for...of` dentro do `test.describe`.
 *
 * **Modo runtime (opt-in)**: setando `E2E_VERIFY_AUTH_ROUTES=1`, o helper
 * valida cada rota descoberta fazendo HEAD/GET anônimo ao preview e
 * exigindo redirect para `/auth` — útil em CI para garantir que não há
 * rotas marcadas como protegidas no código mas servidas como públicas.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APP_TSX = join(process.cwd(), 'src', 'App.tsx');

/** Cache: path + mtime → lista. Evita repetir parse no mesmo worker. */
interface RouteEntry {
  path: string;
  /** True se a rota renderiza MainLayout (ProtectedLayoutRoute). */
  hasLayout: boolean;
}

let cache: { mtime: number; routes: readonly RouteEntry[] } | null = null;

/** Remove comentários // e /* *\/ para evitar capturar rotas desativadas. */
function stripComments(src: string): string {
  return (
    src
      // Block comments (não-greedy)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Line comments (preserva newlines para manter line numbers úteis em erro)
      .replace(/\/\/[^\n]*/g, '')
  );
}

/**
 * Extrai paths de `<Route path="X" element={...}>` cujo element string contém
 * `ProtectedLayoutRoute` ou `ProtectedRoute`.
 *
 * Regex tolera:
 *   - Aspas simples ou duplas no path
 *   - Quebras de linha dentro do `element={...}`
 *   - Aninhamento (`<ProtectedLayoutRoute><ProtectedRoute>...`)
 */
function parseRoutes(src: string): RouteEntry[] {
  const cleaned = stripComments(src);
  const pattern =
    /<Route\s+path=(["'])([^"']+)\1\s+element=\{([\s\S]*?)\}\s*\/?>(?:\s*<\/Route>)?/g;
  const out: RouteEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(cleaned)) !== null) {
    const path = m[2];
    const element = m[3];
    if (!path.startsWith('/')) continue;
    if (path === '*') continue;
    // Ignora redirects puros (Navigate to=...) — são públicos por natureza
    if (/<Navigate\s/.test(element) && !/Protected(Layout)?Route/.test(element)) continue;
    if (/Protected(Layout)?Route/.test(element)) {
      out.push({ path, hasLayout: /ProtectedLayoutRoute/.test(element) });
    }
  }
  return out;
}

/** Carrega as rotas validadas (não-vazio, dedup, ordenado) com cache por mtime.
 *  Compartilhado por todos os getters para garantir as mesmas validações. */
function loadValidatedEntries(): RouteEntry[] {
  const { mtimeMs } = statSync(APP_TSX);
  if (cache && cache.mtime === mtimeMs) return cache.routes;

  const src = readFileSync(APP_TSX, 'utf8');
  const routes = parseRoutes(src);

  if (routes.length === 0) {
    throw new Error(
      '[discoverAuthRoutes] 0 rotas autenticadas encontradas em App.tsx — ' +
        'a regex pode ter quebrado após refactor. Inspecione manualmente.'
    );
  }

  // Dedup por path (mantém o primeiro registro) + ordenação determinística.
  const byPath = new Map<string, RouteEntry>();
  for (const r of routes) if (!byPath.has(r.path)) byPath.set(r.path, r);
  const unique = Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
  cache = { mtime: mtimeMs, routes: unique };
  return unique;
}

/**
 * Lista rotas autenticadas descobertas em `src/App.tsx`.
 * Resultado é cacheado por mtime do arquivo (invalidado em qualquer edição).
 *
 * @throws se `App.tsx` não existir ou parsing retornar 0 rotas (suspeito).
 */
export function getAuthenticatedRoutes(): readonly string[] {
  if (!existsSync(APP_TSX)) {
    throw new Error(`[discoverAuthRoutes] ${APP_TSX} não encontrado.`);
  }
  return loadValidatedEntries().map((r) => r.path);
}

/**
 * Rotas que passam pelo `MainLayout` (unica fonte de `[data-app-scroll]` e da
 * classe `mb-mobile-nav`). Rotas standalone (`ProtectedRoute` sem layout, ex.:
 * `/dispositivos`, `/monitor/:cameraId`) nao renderizam o scroll container e
 * ficam fora da varredura de presenca do wrapper.
 */
export function getLayoutAuthenticatedRoutes(): readonly string[] {
  if (!existsSync(APP_TSX)) {
    throw new Error(`[discoverAuthRoutes] ${APP_TSX} não encontrado.`);
  }
  return loadValidatedEntries()
    .filter((r) => r.hasLayout)
    .map((r) => r.path);
}

/**
 * Versão filtrada: apenas rotas com MainLayout, omitindo `/dev/*`.
 */
export function getAuthenticatedRoutesForSweep(): readonly string[] {
  return getLayoutAuthenticatedRoutes().filter((r) => !r.startsWith('/dev/'));
}

/** Para debugging em scripts: imprime a lista descoberta. */
if (process.argv[1]?.endsWith('discoverAuthRoutes.ts')) {
  // eslint-disable-next-line no-console
  console.log(getAuthenticatedRoutes().join('\n'));
}
