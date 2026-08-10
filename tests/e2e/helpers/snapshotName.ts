/**
 * VISÃO - Convenção de nomes para baselines visuais.
 *
 * Toda spec que usa `toHaveScreenshot()` deve passar o nome lógico via este
 * helper para garantir consistência. O `playwright.config.ts` resolve o
 * caminho final via `snapshotPathTemplate`:
 *
 *   tests/e2e/__screenshots__/<spec>/<project>/<route>/<variant>.png
 *
 * Exemplos:
 *   snapshotName({ route: 'dashboard', variant: 'fullpage' })
 *     → 'dashboard/fullpage.png'
 *   snapshotName({ route: 'heatmap', variant: 'bottom-strip' })
 *     → 'heatmap/bottom-strip.png'
 *   snapshotName({ route: 'auth', variant: 'login', viewport: 'mobile' })
 *     → 'auth/login@mobile.png'
 *
 * Regras:
 *   - `route`: kebab-case do path (sem barras: `/license-plate` → `license-plate`).
 *   - `variant`: tipo de captura (`fullpage`, `bottom-strip`, `header`, `drawer-open`).
 *   - `viewport` (opcional): só quando o mesmo project gera múltiplas resoluções.
 *   - Nunca incluir browser/platform — o `{projectName}` cuida disso.
 */

export interface SnapshotNameInput {
  /** Rota (kebab-case, sem barra inicial). */
  route: string;
  /** Variante da captura (kebab-case). */
  variant: string;
  /** Sufixo opcional de viewport quando o spec varia resolução por test. */
  viewport?: string;
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/;

function assertSlug(value: string, field: string): void {
  if (!SLUG_REGEX.test(value)) {
    throw new Error(
      `[snapshotName] "${field}" inválido: "${value}". Use kebab-case (a-z, 0-9, -).`
    );
  }
}

/**
 * Normaliza um path em slug. Ex.: '/license-plate' → 'license-plate', '/' → 'root'.
 */
export function routeToSlug(path: string): string {
  if (!path || path === '/') return 'root';
  return path.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, '-').toLowerCase();
}

export function snapshotName(input: SnapshotNameInput): string {
  assertSlug(input.route, 'route');
  assertSlug(input.variant, 'variant');
  const base = `${input.route}/${input.variant}`;
  const withViewport = input.viewport
    ? (assertSlug(input.viewport, 'viewport'), `${base}@${input.viewport}`)
    : base;
  return `${withViewport}.png`;
}
