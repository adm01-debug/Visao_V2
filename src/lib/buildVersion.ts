/**
 * Build-version watcher for VISÃO.
 *
 * Compares the build id embedded at compile time (__APP_BUILD_ID__) against
 * /version.json served alongside the deployed bundle. When they diverge,
 * purges Cache Storage and force-reloads so the tab uses the new bundle.
 *
 * Inject via vite.config.ts define.
 */
declare const __APP_BUILD_ID__: string | undefined;
const CURRENT_BUILD_ID: string =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

const VERSION_URL = '/version.json';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const RELOAD_FLAG = 'visao-build-reload-once';

let started = false;

async function purgeCaches(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch { /* noop */ }
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch { /* noop */ }
}

async function forceBundleRefresh(reason: string): Promise<void> {
  const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1';
  await purgeCaches();
  if (alreadyReloaded) {
    console.warn('[buildVersion] Mismatch persists after reload — aborting loop.', reason);
    return;
  }
  try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* noop */ }
  console.warn('[buildVersion] Forcing bundle refresh:', reason);
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_bv', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

async function checkVersion(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${VERSION_URL}?ts=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!res.ok) return;
    const payload = (await res.json()) as { buildId?: string } | null;
    const remote = payload?.buildId;
    if (!remote || remote === CURRENT_BUILD_ID) {
      if (remote === CURRENT_BUILD_ID) {
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* noop */ }
      }
      return;
    }
    await forceBundleRefresh(`client=${CURRENT_BUILD_ID} server=${remote}`);
  } catch {
    // offline / timeout — retry next tick
  } finally {
    clearTimeout(timeoutId);
  }
}

function isSkippableEnv(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    if (window.self !== window.top) return true;
    const host = window.location.hostname;
    if (
      host.startsWith('id-preview--') ||
      host.startsWith('preview--') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) return true;
  } catch { /* noop */ }
  return false;
}

/**
 * Start the build version watcher. Idempotent.
 */
export function startBuildVersionWatcher(): void {
  if (started || typeof window === 'undefined') return;
  if (isSkippableEnv()) return;
  started = true;

  // First check after tab is idle (10s)
  setTimeout(() => void checkVersion(), 10_000);
  setInterval(() => void checkVersion(), POLL_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkVersion();
  });
  window.addEventListener('focus', () => void checkVersion());
}

export function getCurrentBuildId(): string {
  return CURRENT_BUILD_ID;
}
