/**
 * VISÃO — E2E dos cenários adversariais da recaptura no PtzCalibrationPanel.
 *
 * Usa o harness DEV `/__test/ptz-calibration` que injeta um driver PTZ
 * scriptável e omite `cameraId` (evita tráfego Supabase).
 *
 * Cobertura:
 *   1. Recaptura com `min ≥ max` → outcome "invalid", toast erro, nenhuma
 *      chamada a `onChange`.
 *   2. Editor "Observado" com valores fora do AXIS_BOUNDS (pan ∈ [-1,1]) →
 *      toast `Fora do intervalo permitido`; caminho de min ≥ max no mesmo
 *      editor → toast `Mínimo precisa ser menor que o máximo`.
 *   3. Recaptura abortada durante o sweep — driver "hangForever" mantém o dome
 *      em movimento indefinido; clicar em Abortar encerra com outcome
 *      "aborted" e nenhum `onChange`.
 *
 * Rodar isolado:
 *   npx playwright test tests/e2e/ptz-recapture-adversarial.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const HARNESS_URL = '/__test/ptz-calibration';

async function ensureHarness(page: Page) {
  await page.goto(HARNESS_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="ptz-calibration-harness"]');
  await page.waitForFunction(() => Boolean(window.__ptzCalibrationHarness));
  await page.evaluate(() => window.__ptzCalibrationHarness?.reset());
}

async function readLastLimits(page: Page) {
  return page.evaluate(() => window.__ptzCalibrationHarness?.lastLimits ?? null);
}

test.describe('PtzCalibrationPanel · cenários adversariais de recaptura', () => {
  test.beforeEach(async ({ page }) => {
    await ensureHarness(page);
  });

  test('recaptura com min ≥ max exibe toast "Recaptura inválida" e não altera limites', async ({ page }) => {
    // minStall > maxStall — driveToStall(-1) retorna 0.5, driveToStall(+1) retorna 0.3.
    await page.evaluate(() => {
      window.__ptzCalibrationHarness?.configure({ minStall: 0.5, maxStall: 0.3, hangForever: false });
    });

    // Trigger direto da recaptura via botão do card do eixo pan.
    // O botão fica destructive apenas após um desvio, então clicamos o padrão
    // e forçamos a confirmação do AlertDialog.
    await page.getByTestId('ptz-recapture-pan').click();
    await expect(page.getByTestId('ptz-recapture-confirm')).toBeVisible();
    await page.getByTestId('ptz-recapture-confirm-btn').click();

    // Aguarda o toast de invalidação (sonner monta em [data-sonner-toaster]).
    await expect(
      page.getByText(/Recaptura inválida:.*min.*≥.*max/i),
    ).toBeVisible({ timeout: 10_000 });

    // Nenhuma persistência ocorreu (onChange nunca disparado).
    expect(await readLastLimits(page)).toBeNull();
  });

  test('editor "Observado" rejeita valores fora do intervalo permitido do eixo', async ({ page }) => {
    // Pan tem AXIS_BOUNDS [-1, 1]. Tentar min=-2 deve falhar com toast dedicado.
    await page.locator('#obs-min-pan').fill('-2');
    await page.locator('#obs-max-pan').fill('0.5');
    await page.getByTestId('ptz-observed-save-pan').click();

    await expect(
      page.getByText(/Fora do intervalo permitido \[-1, 1\]/i),
    ).toBeVisible({ timeout: 5_000 });

    // Nenhum onChange (editor "observado" grava só em calibração, não em limits),
    // e o input mantém o valor rejeitado para o operador corrigir.
    await expect(page.locator('#obs-min-pan')).toHaveValue('-2');
  });

  test('editor "Observado" rejeita min ≥ max no mesmo eixo', async ({ page }) => {
    await page.locator('#obs-min-pan').fill('0.4');
    await page.locator('#obs-max-pan').fill('0.4');
    await page.getByTestId('ptz-observed-save-pan').click();

    await expect(
      page.getByText(/Mínimo precisa ser menor que o máximo/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('abortar durante o sweep de min encerra a recaptura sem persistir limites', async ({ page }) => {
    // Driver "trava" reportando moving:true indefinidamente — driveToStall
    // fica no polling loop até detectar recaptureAbortRef.current=true.
    await page.evaluate(() => {
      window.__ptzCalibrationHarness?.configure({ minStall: -0.9, maxStall: 0.9, hangForever: true });
    });

    await page.getByTestId('ptz-recapture-pan').click();
    await expect(page.getByTestId('ptz-recapture-confirm')).toBeVisible();
    await page.getByTestId('ptz-recapture-confirm-btn').click();

    // Painel de progresso aparece: confirma que estamos em to-min.
    const progress = page.getByTestId('ptz-recapture-progress-pan');
    await expect(progress).toBeVisible({ timeout: 5_000 });
    await expect(progress).toContainText(/Buscando extremo mínimo/i);

    // Clica em Abortar dentro do painel.
    await progress.getByRole('button', { name: /abortar/i }).click();

    // Toast de aborto aparece (proveniente de guidedRecapture).
    await expect(
      page.getByText(/Recaptura de mínimo abortada ou sem leitura/i),
    ).toBeVisible({ timeout: 20_000 });

    // O painel de progresso é desmontado depois do finally + timeout(1200ms).
    await expect(progress).toBeHidden({ timeout: 5_000 });

    // Nada foi persistido.
    expect(await readLastLimits(page)).toBeNull();
  });
});
