/**
 * VISÃO - Fixture E2E: anexos automáticos de depuração em falhas.
 *
 * Substitui o `import { test } from '@playwright/test'` padrão por uma
 * versão estendida que, em cada teste:
 *
 *   1. Coleta **todas** as mensagens de `console` (com tipo + texto + URL).
 *   2. Coleta **todas** as requisições de rede (URL + método + status +
 *      duração + tipo de recurso).
 *   3. Captura erros não tratados na página (`pageerror`).
 *
 * Em **caso de falha** (`testInfo.status !== testInfo.expectedStatus`), anexa
 * automaticamente ao relatório:
 *
 *   - `console.log` — log estruturado JSON com todas as mensagens.
 *   - `network.log` — log estruturado JSON de todas as requisições, com
 *     destaque visual (`⚠️`) para 4xx/5xx.
 *   - `pageerrors.log` — exceções JS não tratadas (se houver).
 *   - `failure-screenshot.png` — screenshot adicional `fullPage` no momento
 *     da falha (complementa o `only-on-failure` do Playwright que captura
 *     ANTES da limpeza, mas nem sempre na URL final).
 *   - `current-url.txt` — URL final da página (útil quando redirecionamento
 *     inesperado para `/auth` causou a falha).
 *
 * `screenshot`, `video` e `trace` continuam controlados pelo
 * `playwright.config.ts` (configurados em `use.screenshot`, `use.video`,
 * `use.trace`). Esta fixture **adiciona** anexos sem substituir os nativos.
 *
 * **Uso:** trocar imports nos specs:
 * ```diff
 * - import { test, expect } from '@playwright/test';
 * + import { test, expect } from './helpers/testFixtures';
 * ```
 *
 * **Por que não `afterEach` em cada arquivo?** Centralizar via fixture:
 *   - Garante consistência entre todos os specs.
 *   - Evita esquecer em arquivos novos.
 *   - Usa `auto: true` para rodar transparentemente.
 */
import {
  test as base,
  expect,
  type ConsoleMessage,
  type Request,
  type Response,
} from '@playwright/test';

interface ConsoleEntry {
  type: string;
  text: string;
  location: string;
  timestamp: string;
}

interface NetworkEntry {
  url: string;
  method: string;
  status: number | null;
  resourceType: string;
  duration: number | null;
  startedAt: string;
  failure?: string;
}

interface PageErrorEntry {
  message: string;
  stack: string;
  timestamp: string;
}

/**
 * Fixture estendida com coleta automática de logs e anexos em falhas.
 * `auto: true` faz rodar em todo teste sem precisar pedir explicitamente.
 */
export const test = base.extend<{
  debugAttachments: void;
}>({
  debugAttachments: [
    async ({ page }, use, testInfo) => {
      const consoleLogs: ConsoleEntry[] = [];
      const networkLogs: NetworkEntry[] = [];
      const pageErrors: PageErrorEntry[] = [];
      const requestStartTimes = new Map<Request, number>();

      // ─── Coleta: console ────────────────────────────────────────────
      const onConsole = (msg: ConsoleMessage) => {
        const loc = msg.location();
        consoleLogs.push({
          type: msg.type(),
          text: msg.text(),
          location: loc.url ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : '',
          timestamp: new Date().toISOString(),
        });
      };

      // ─── Coleta: network ────────────────────────────────────────────
      const onRequest = (req: Request) => {
        requestStartTimes.set(req, Date.now());
      };
      const onResponse = (resp: Response) => {
        const req = resp.request();
        const startedAtMs = requestStartTimes.get(req) ?? Date.now();
        networkLogs.push({
          url: resp.url(),
          method: req.method(),
          status: resp.status(),
          resourceType: req.resourceType(),
          duration: Date.now() - startedAtMs,
          startedAt: new Date(startedAtMs).toISOString(),
        });
        requestStartTimes.delete(req);
      };
      const onRequestFailed = (req: Request) => {
        const startedAtMs = requestStartTimes.get(req) ?? Date.now();
        networkLogs.push({
          url: req.url(),
          method: req.method(),
          status: null,
          resourceType: req.resourceType(),
          duration: Date.now() - startedAtMs,
          startedAt: new Date(startedAtMs).toISOString(),
          failure: req.failure()?.errorText ?? 'unknown',
        });
        requestStartTimes.delete(req);
      };

      // ─── Coleta: erros JS não tratados ──────────────────────────────
      const onPageError = (err: Error) => {
        pageErrors.push({
          message: err.message,
          stack: err.stack ?? '',
          timestamp: new Date().toISOString(),
        });
      };

      page.on('console', onConsole);
      page.on('request', onRequest);
      page.on('response', onResponse);
      page.on('requestfailed', onRequestFailed);
      page.on('pageerror', onPageError);

      // ─── Executa o teste ────────────────────────────────────────────
      await use();

      // ─── Cleanup listeners (evita vazamento entre workers) ──────────
      page.off('console', onConsole);
      page.off('request', onRequest);
      page.off('response', onResponse);
      page.off('requestfailed', onRequestFailed);
      page.off('pageerror', onPageError);

      // ─── Anexa apenas em falha ──────────────────────────────────────
      const failed = testInfo.status !== testInfo.expectedStatus;
      if (!failed) return;

      // Console log
      await testInfo
        .attach('console.log', {
          body: JSON.stringify(consoleLogs, null, 2),
          contentType: 'application/json',
        })
        .catch(() => {});

      // Network log com destaque para erros
      const networkSummary = {
        total: networkLogs.length,
        errors: networkLogs.filter((r) => r.status !== null && r.status >= 400).length,
        failed: networkLogs.filter((r) => r.status === null).length,
        entries: networkLogs.map((r) => ({
          ...r,
          flag:
            r.status === null
              ? '❌ FAILED'
              : r.status >= 500
                ? '⚠️ 5xx'
                : r.status >= 400
                  ? '⚠️ 4xx'
                  : 'ok',
        })),
      };
      await testInfo
        .attach('network.log', {
          body: JSON.stringify(networkSummary, null, 2),
          contentType: 'application/json',
        })
        .catch(() => {});

      // Page errors
      if (pageErrors.length > 0) {
        await testInfo
          .attach('pageerrors.log', {
            body: JSON.stringify(pageErrors, null, 2),
            contentType: 'application/json',
          })
          .catch(() => {});
      }

      // URL final (debug de redirects inesperados)
      await testInfo
        .attach('current-url.txt', {
          body: page.url(),
          contentType: 'text/plain',
        })
        .catch(() => {});

      // Screenshot adicional no estado final (page pode ter mudado desde
      // o screenshot automático do Playwright)
      try {
        const buf = await page.screenshot({ fullPage: true, timeout: 5000 });
        await testInfo.attach('failure-screenshot.png', {
          body: buf,
          contentType: 'image/png',
        });
      } catch {
        /* página pode estar fechada */
      }
    },
    { auto: true },
  ],
});

export { expect };
