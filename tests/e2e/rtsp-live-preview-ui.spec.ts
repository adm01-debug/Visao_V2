/**
 * VISÃO — E2E UI do LivePreviewPlayer (prévia ao vivo 60s).
 *
 * Usa o harness DEV `/__test/live-preview` que injeta um `invoke` mockado.
 * Cobre:
 *   1. Iniciar prévia → status "playing", vídeo montado, `start` chamado.
 *   2. Countdown regressivo (tempo restante decresce).
 *   3. Estender +60s → `extend` chamado, contador incrementado, badge de extensões visível.
 *   4. Limite de 3 extensões desabilita o botão.
 *   5. Fechar diálogo → `stop` chamado com o sessionId, callback `unmount` disparado.
 *   6. Falha em `start` → status "error", nenhuma sessão persistida.
 *
 * Rodar isolado: `npx playwright test tests/e2e/rtsp-live-preview-ui.spec.ts`.
 */
import { test, expect } from '@playwright/test';
import { gotoAuthenticated } from './helpers/authSession';

const HARNESS_URL = '/__test/live-preview';

type InvokeAction = 'start' | 'extend' | 'stop';

async function getLog(page: import('@playwright/test').Page) {
  return await page.evaluate(() =>
    (window.__livePreviewHarness?.invokeLog ?? []).map((e) => ({
      action: e.action as InvokeAction,
      payload: e.payload as Record<string, unknown>,
    }))
  );
}

async function resetHarness(page: import('@playwright/test').Page) {
  await page.evaluate(() => window.__livePreviewHarness?.reset());
}

test.describe('LivePreviewPlayer — fluxo UI (prévia ao vivo 60s)', () => {
  test.beforeEach(async ({ page }) => {
    const ready = await gotoAuthenticated(page, HARNESS_URL, { waitUntil: 'domcontentloaded' });
    test.skip(!ready, 'Sessão autenticada indisponível para o harness DEV');
    await page.waitForSelector('[data-testid="live-preview-harness"]');
    await page.waitForFunction(() => Boolean(window.__livePreviewHarness));
    await resetHarness(page);
  });

  test('iniciar prévia dispara start, mostra vídeo e countdown ativo', async ({ page }) => {
    await page.getByTestId('harness-open').click();
    const player = page.getByTestId('live-preview-player');
    await expect(player).toBeVisible();

    await page.getByTestId('live-preview-start').click();

    await expect(player).toHaveAttribute('data-status', 'playing');
    await expect(page.getByTestId('live-preview-video')).toBeVisible();

    const remaining = page.getByTestId('live-preview-remaining');
    await expect(remaining).toHaveAttribute('data-remaining', '60');

    // Countdown deve decrescer em ≤ 3s
    await expect
      .poll(async () => Number(await remaining.getAttribute('data-remaining')), { timeout: 4000 })
      .toBeLessThan(60);

    const log = await getLog(page);
    expect(log[0]?.action).toBe('start');
    expect(String(log[0]?.payload?.rtspUrl ?? '')).toMatch(/^rtsp:\/\//);
  });

  test('estender +60s incrementa o tempo restante e o badge de extensões', async ({ page }) => {
    await page.getByTestId('harness-open').click();
    await page.getByTestId('live-preview-start').click();
    const remaining = page.getByTestId('live-preview-remaining');
    await expect(remaining).toHaveAttribute('data-remaining', /^\d+$/);

    const before = Number(await remaining.getAttribute('data-remaining'));
    await page.getByTestId('live-preview-extend').click();

    await expect
      .poll(async () => Number(await remaining.getAttribute('data-remaining')), { timeout: 3000 })
      .toBeGreaterThanOrEqual(before + 55);

    await expect(page.getByTestId('live-preview-extensions')).toHaveText(/\+60s/);

    const log = await getLog(page);
    const extendCall = log.find((e) => e.action === 'extend');
    expect(extendCall).toBeTruthy();
    expect(extendCall?.payload?.sessionId).toBe('sess-mock');
    expect(extendCall?.payload?.seconds).toBe(60);
  });

  test('limite de 3 extensões desabilita o botão Estender', async ({ page }) => {
    await page.getByTestId('harness-open').click();
    await page.getByTestId('live-preview-start').click();
    const extendBtn = page.getByTestId('live-preview-extend');

    for (let i = 0; i < 3; i++) {
      await extendBtn.click();
      await expect(page.getByTestId('live-preview-extensions')).toHaveText(
        new RegExp(`\\+${(i + 1) * 60}s`)
      );
    }
    await expect(extendBtn).toBeDisabled();

    const log = await getLog(page);
    expect(log.filter((e) => e.action === 'extend')).toHaveLength(3);
  });

  test('fechar o diálogo encerra a sessão (stop com sessionId + motivo unmount)', async ({
    page,
  }) => {
    await page.getByTestId('harness-open').click();
    await page.getByTestId('live-preview-start').click();
    await expect(page.getByTestId('live-preview-player')).toHaveAttribute('data-status', 'playing');

    await page.getByTestId('harness-close').click();

    // Player desmontado — harness volta ao estado fechado.
    await expect(page.getByTestId('harness-dialog')).toHaveAttribute('data-open', 'false');

    // Aguarda o cleanup async chamar stop().
    await expect
      .poll(async () => (await getLog(page)).some((e) => e.action === 'stop'), { timeout: 3000 })
      .toBe(true);

    const log = await getLog(page);
    const stopCall = log.find((e) => e.action === 'stop');
    expect(stopCall?.payload?.sessionId).toBe('sess-mock');

    const reason = await page.evaluate(() => window.__livePreviewHarness?.lastReason ?? null);
    expect(reason).toBe('unmount');
  });

  test('falha em start deixa o player em estado de erro sem sessão ativa', async ({ page }) => {
    await page.getByTestId('harness-open').click();
    await page.evaluate(() =>
      window.__livePreviewHarness?.setNextStartResult({
        error: 'rtsp_unreachable',
        sessionId: undefined,
        hlsUrl: undefined,
      })
    );
    await page.getByTestId('live-preview-start').click();

    await expect(page.getByTestId('live-preview-player')).toHaveAttribute('data-status', 'error');
    await expect(page.getByText(/Falha:/)).toBeVisible();

    // Fechar não deve chamar stop (não há sessionId).
    await page.getByTestId('harness-close').click();
    const log = await getLog(page);
    expect(log.some((e) => e.action === 'stop')).toBe(false);
  });
});
