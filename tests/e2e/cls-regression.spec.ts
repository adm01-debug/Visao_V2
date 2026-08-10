/**
 * cls-regression.spec.ts
 *
 * Regressão automatizada de Cumulative Layout Shift (CLS) por rota.
 * Falha se o CLS medido durante o carregamento ultrapassar o threshold
 * configurado para aquela rota.
 *
 * Como funciona:
 *   1. Antes de qualquer JS da página, injetamos um `PerformanceObserver`
 *      que acumula `LayoutShift.value` em `window.__clsTotal` e mantém
 *      uma lista das maiores fontes em `window.__clsTopSources`.
 *   2. Navegamos para a rota, aguardamos `networkidle` + um settle window
 *      (default 3s) para capturar shifts tardios (lazy chunks, fontes).
 *   3. Lemos o valor final e comparamos com o threshold (Web Vitals: 0.1).
 *
 * Configuração via env:
 *   - `CLS_THRESHOLD` (default: `0.1`) — limite global aplicado a todas
 *     as rotas, exceto se sobrescrito em `ROUTE_THRESHOLDS`.
 *   - `CLS_SETTLE_MS` (default: `3000`) — janela após `networkidle` para
 *     aguardar shifts tardios.
 *   - `CLS_ROUTES` (default: `/cameras,/alerts,/zones,/dashboard`) — lista
 *     de rotas a testar (CSV).
 *
 * Por rota, é possível ajustar threshold individual no objeto
 * `ROUTE_THRESHOLDS` abaixo (útil quando uma rota tem regressão conhecida
 * sendo trabalhada — sem mascarar regressões nas outras).
 *
 * Anexamos um relatório por rota nos resultados (Playwright `attach`)
 * com `path`, `cls`, `topSources` e `shiftCount`, para facilitar o
 * diagnóstico em caso de falha.
 */
import { test, expect, type Page } from '@playwright/test';

// ----- Configuração -----
const DEFAULT_ROUTES = ['/cameras', '/alerts', '/zones', '/dashboard'] as const;

const ROUTE_THRESHOLDS: Record<string, number> = {
  // Sobrescritas opcionais por rota; sem entrada → usa CLS_THRESHOLD/0.1.
  // Ex.: '/dashboard': 0.15,
};

const GLOBAL_THRESHOLD = Number.parseFloat(process.env.CLS_THRESHOLD ?? '0.1');
const SETTLE_MS = Number.parseInt(process.env.CLS_SETTLE_MS ?? '3000', 10);
const ROUTES = (process.env.CLS_ROUTES ?? DEFAULT_ROUTES.join(','))
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

interface CLSMeasurement {
  path: string;
  cls: number;
  shiftCount: number;
  topSources: Array<{ selector: string; value: number }>;
}

declare global {
  interface Window {
    __clsTotal?: number;
    __clsShiftCount?: number;
    __clsTopSources?: Array<{ selector: string; value: number }>;
  }
}

/**
 * Script injetado ANTES de qualquer outro JS da página. Configura um
 * `PerformanceObserver` para `layout-shift` e mantém os agregados em
 * `window.__cls*`.
 */
const initCLSObserver = `
(() => {
  if (window.__clsTotal !== undefined) return; // já instalado
  window.__clsTotal = 0;
  window.__clsShiftCount = 0;
  window.__clsTopSources = [];
  if (typeof PerformanceObserver === 'undefined') return;
  const supported = PerformanceObserver.supportedEntryTypes
    && PerformanceObserver.supportedEntryTypes.includes('layout-shift');
  if (!supported) return;
  const serialize = (node) => {
    if (!node || node.nodeType !== 1) return '<unknown>';
    const tag = node.tagName.toLowerCase();
    const cls = typeof node.className === 'string' ? node.className.split(/\\s+/)[0] : '';
    const id = node.id ? '#' + node.id : '';
    return tag + (cls ? '.' + cls.slice(0, 30) : '') + id;
  };
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput || !entry.value) continue;
        window.__clsTotal += entry.value;
        window.__clsShiftCount += 1;
        const src = entry.sources && entry.sources[0];
        const selector = src ? serialize(src.node) : '<no-source>';
        window.__clsTopSources.push({ selector, value: entry.value });
      }
    });
    obs.observe({ type: 'layout-shift', buffered: true });
  } catch (e) { /* unsupported */ }
})();
`;

async function measureCLS(page: Page, path: string): Promise<CLSMeasurement> {
  await page.addInitScript(initCLSObserver);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Aguarda settle: networkidle (lazy chunks) + janela para shifts tardios.
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  } catch {
    // ignore — algumas rotas têm streams persistentes
  }
  await page.waitForTimeout(SETTLE_MS);

  return page.evaluate(() => {
    const top = (window.__clsTopSources ?? [])
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((s) => ({ selector: s.selector, value: Number(s.value.toFixed(4)) }));
    return {
      path: window.location.pathname,
      cls: Number((window.__clsTotal ?? 0).toFixed(4)),
      shiftCount: window.__clsShiftCount ?? 0,
      topSources: top,
    };
  });
}

test.describe('CLS regression', () => {
  test.describe.configure({ mode: 'serial' });

  for (const route of ROUTES) {
    const threshold = ROUTE_THRESHOLDS[route] ?? GLOBAL_THRESHOLD;

    test(`${route} mantém CLS <= ${threshold}`, async ({ page }, testInfo) => {
      const result = await measureCLS(page, route);

      await testInfo.attach(`cls-${route.replace(/\W+/g, '_')}.json`, {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      });

      const top = result.topSources
        .map((s, i) => `  #${i + 1} ${s.selector} (+${s.value})`)
        .join('\n');

      expect(
        result.cls,
        `CLS ${result.cls} excedeu threshold ${threshold} em ${route}\n` +
          `Shifts: ${result.shiftCount}\n` +
          `Top fontes:\n${top || '  (nenhuma)'}`
      ).toBeLessThanOrEqual(threshold);
    });
  }
});
