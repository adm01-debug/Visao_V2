/**
 * VISÃO — E2E de resiliência do LivePreviewPlayer.
 *
 * Simula falhas conhecidas do pipeline RTSP → MediaMTX → HLS:
 *   - `mediamtx_pull_failed` (erro retornado pelo `start`).
 *   - `hls_timeout`          (idem — o watchdog client-side é validado em unit test).
 *   - `connection_dropped`   (evento `error` disparado no <video> durante playing).
 *   - `extend_failed`        (erro retornado por `extend`, prévia continua).
 *
 * Usa o harness `/__test/live-preview` que injeta um `invoke` mockado.
 */
import { test, expect } from '@playwright/test';
import { gotoAuthenticated } from './helpers/authSession';

const HARNESS_URL = '/__test/live-preview';

async function openAndStart(
  page: import('@playwright/test').Page,
  startResult?: Record<string, unknown>,
) {
  await page.getByTestId('harness-open').click();
  if (startResult) {
    await page.evaluate(
      (r) => window.__livePreviewHarness?.setNextStartResult(r as never),
      startResult,
    );
  }
  await page.getByTestId('live-preview-start').click();
}

test.describe('LivePreviewPlayer — resiliência (falhas MediaMTX/HLS)', () => {
  test.beforeEach(async ({ page }) => {
    const ready = await gotoAuthenticated(page, HARNESS_URL, { waitUntil: 'domcontentloaded' });
    test.skip(!ready, 'Sessão autenticada indisponível para o harness DEV');
    await page.waitForSelector('[data-testid="live-preview-harness"]');
    await page.waitForFunction(() => Boolean(window.__livePreviewHarness));
    await page.evaluate(() => window.__livePreviewHarness?.reset());
  });

  test('mediamtx_pull_failed exibe título + sugestão de firewall/credenciais', async ({ page }) => {
    await openAndStart(page, { error: 'mediamtx_pull_failed' });

    const err = page.getByTestId('live-preview-error');
    await expect(err).toBeVisible();
    await expect(err).toHaveAttribute('data-error-code', 'mediamtx_pull_failed');
    await expect(err).toContainText(/MediaMTX/i);
    await expect(err).toContainText(/firewall|credenciais|554/i);

    // Sem sessão ativa: nenhum stop deve ter sido chamado.
    const stops = await page.evaluate(
      () => window.__livePreviewHarness?.invokeLog.filter((e) => e.action === 'stop').length ?? 0,
    );
    expect(stops).toBe(0);
  });

  test('hls_timeout retornado pelo servidor mostra sugestão de substream/latência', async ({ page }) => {
    await openAndStart(page, { error: 'hls_timeout' });
    const err = page.getByTestId('live-preview-error');
    await expect(err).toHaveAttribute('data-error-code', 'hls_timeout');
    await expect(err).toContainText(/HLS/i);
    await expect(err).toContainText(/10s|substream|latência/i);
  });

  test('connection_dropped: erro no <video> encerra sessão com sugestão de Wi-Fi/PoE', async ({ page }) => {
    await openAndStart(page);
    const player = page.getByTestId('live-preview-player');
    await expect(player).toHaveAttribute('data-status', 'playing');

    const dispatched = await page.evaluate(() =>
      window.__livePreviewHarness?.simulateVideoError() ?? false,
    );
    expect(dispatched).toBe(true);

    await expect(player).toHaveAttribute('data-status', 'error', { timeout: 3000 });
    const err = page.getByTestId('live-preview-error');
    await expect(err).toHaveAttribute('data-error-code', 'connection_dropped');
    await expect(err).toContainText(/caiu|conexão/i);
    await expect(err).toContainText(/Wi-?Fi|PoE|reinicie/i);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.__livePreviewHarness?.invokeLog.some(
            (e) => e.action === 'stop' && (e.payload as { sessionId?: string }).sessionId === 'sess-mock',
          ),
        ),
      )
      .toBe(true);

    const reason = await page.evaluate(() => window.__livePreviewHarness?.lastReason);
    expect(reason).toBe('error');
  });

  test('extend_failed mantém a prévia ativa e mostra warning inline com sugestão', async ({ page }) => {
    await openAndStart(page);
    await page.evaluate(() =>
      window.__livePreviewHarness?.setNextExtendResult({ error: 'extend_failed' }),
    );
    await page.getByTestId('live-preview-extend').click();

    const warn = page.getByTestId('live-preview-warning');
    await expect(warn).toBeVisible();
    await expect(warn).toHaveAttribute('data-error-code', 'extend_failed');
    await expect(warn).toContainText(/estender/i);

    // Vídeo permanece montado (status playing).
    await expect(page.getByTestId('live-preview-player')).toHaveAttribute('data-status', 'playing');
    await expect(page.getByTestId('live-preview-video')).toBeVisible();
  });
});
