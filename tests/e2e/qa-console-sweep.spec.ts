/**
 * QA Console Errors Sweep
 * -----------------------
 * Visita as 12 rotas autenticadas em desktop (1280×720) e mobile (iPhone 12)
 * e captura TODOS os `console.error`, `pageerror` e respostas HTTP 4xx/5xx.
 *
 * Os eventos são gravados em `qa-console-report/raw-events.json` para o
 * gerador `scripts/build-qa-console-report.mjs` consolidar em um relatório
 * Markdown destacando apenas erros legítimos (após filtro de ruído conhecido).
 *
 * Como rodar:
 *   npm run qa:console-sweep
 *   npm run report:qa-console      # gera o Markdown
 *
 * Sem credenciais E2E_TEST_*, faz skip controlado.
 */
import { devices, type Page } from '@playwright/test';
import { test } from './helpers/testFixtures';
import { gotoAuthenticated } from './helpers/authSession';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/heatmap',
  '/analytics',
  '/recordings',
  '/people',
  '/license-plate',
  '/settings',
  '/users',
  '/notification-settings',
  '/zones',
];

const OUT_DIR = join(process.cwd(), 'qa-console-report');
const OUT_FILE = join(OUT_DIR, 'raw-events.json');

interface CapturedEvent {
  viewport: 'desktop' | 'mobile';
  route: string;
  kind: 'console.error' | 'pageerror' | 'http';
  text: string;
  url?: string;
  status?: number;
  stack?: string;
  timestamp: string;
}

const allEvents: CapturedEvent[] = [];

function attach(page: Page, viewport: 'desktop' | 'mobile', route: string): void {
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    allEvents.push({
      viewport,
      route,
      kind: 'console.error',
      text: msg.text(),
      url: msg.location().url,
      timestamp: new Date().toISOString(),
    });
  });
  page.on('pageerror', (err) => {
    allEvents.push({
      viewport,
      route,
      kind: 'pageerror',
      text: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  });
  page.on('response', (resp) => {
    const status = resp.status();
    if (status < 400) return;
    allEvents.push({
      viewport,
      route,
      kind: 'http',
      text: `HTTP ${status} ${resp.url()}`,
      url: resp.url(),
      status,
      timestamp: new Date().toISOString(),
    });
  });
}

async function sweepRoute(
  page: Page,
  route: string,
  viewport: 'desktop' | 'mobile'
): Promise<void> {
  attach(page, viewport, route);
  const ready = await gotoAuthenticated(page, route, { waitUntil: 'domcontentloaded' });
  if (!ready) return;
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800); // captura erros tardios
}

test.afterAll(async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(allEvents, null, 2));
  // eslint-disable-next-line no-console
  console.log(`[qa-console] ${allEvents.length} eventos gravados em ${OUT_FILE}`);
});

test.describe('QA Console Sweep — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  for (const route of ROUTES) {
    test(`desktop ${route}`, async ({ page }) => {
      await sweepRoute(page, route, 'desktop');
    });
  }
});

test.describe('QA Console Sweep — Mobile', () => {
  test.use({ ...devices['iPhone 12'] });
  for (const route of ROUTES) {
    test(`mobile ${route}`, async ({ page }) => {
      await sweepRoute(page, route, 'mobile');
    });
  }
});
