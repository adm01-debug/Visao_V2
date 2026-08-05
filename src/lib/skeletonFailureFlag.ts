/**
 * Debug-only flag para SIMULAR falha no carregamento de skeletons / lazy chunks.
 *
 * Ativação:
 *   - URL: ?skeleton-fail=all | cameras | alerts | zones (acumula no localStorage)
 *   - localStorage: visao:skeleton-fail = "all" | "cameras" | "alerts" | "zones" | "off"
 *   - Programático: setSkeletonFailureMode(mode)
 *
 * Uso pelos consumidores (ex.: lazyLoad, skeletons branded):
 *   if (shouldSimulateSkeletonFailure('cameras')) throw new Error('debug: skeleton fail');
 *
 * Disponível somente em DEV ou quando ?debug=skeletons está presente.
 */
export type SkeletonFailureMode = 'off' | 'all' | 'cameras' | 'alerts' | 'zones';

const STORAGE_KEY = 'visao:skeleton-fail';
const URL_PARAM = 'skeleton-fail';

const VALID: ReadonlySet<SkeletonFailureMode> = new Set([
  'off',
  'all',
  'cameras',
  'alerts',
  'zones',
]);

const listeners = new Set<(mode: SkeletonFailureMode) => void>();

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Lê a flag do localStorage (com sincronização one-shot da URL na primeira leitura). */
export function getSkeletonFailureMode(): SkeletonFailureMode {
  if (!isBrowser()) return 'off';
  try {
    const url = new URLSearchParams(window.location.search).get(URL_PARAM);
    if (url && VALID.has(url as SkeletonFailureMode)) {
      window.localStorage.setItem(STORAGE_KEY, url);
      return url as SkeletonFailureMode;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && VALID.has(raw as SkeletonFailureMode)) {
      return raw as SkeletonFailureMode;
    }
  } catch {
    /* ignore */
  }
  return 'off';
}

export function setSkeletonFailureMode(mode: SkeletonFailureMode): void {
  if (!isBrowser() || !VALID.has(mode)) return;
  try {
    if (mode === 'off') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(mode));
}

export function subscribeSkeletonFailure(fn: (mode: SkeletonFailureMode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Avalia se a falha deve ser simulada para um determinado escopo.
 * scope = 'cameras' | 'alerts' | 'zones' | 'global'
 */
export function shouldSimulateSkeletonFailure(
  scope: 'cameras' | 'alerts' | 'zones' | 'global'
): boolean {
  const mode = getSkeletonFailureMode();
  if (mode === 'off') return false;
  if (mode === 'all') return true;
  if (scope === 'global') return false;
  return mode === scope;
}

/** Visível em DEV ou com ?debug=skeletons. */
export function isSkeletonDebugEnabled(): boolean {
  if (!isBrowser()) return false;
  try {
    if (import.meta.env?.DEV) return true;
    return new URLSearchParams(window.location.search).get('debug') === 'skeletons';
  } catch {
    return false;
  }
}
