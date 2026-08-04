/**
 * Filters lifecycle E2E — "Limpar filtros" com confirmação, cancelar,
 * desfazer (10s) e persistência após reload.
 *
 * Página alvo: Recognition Logs (já migrada para `useManagedFilters`).
 * Cobre os mesmos contratos exigidos para Alerts e demais páginas que
 * forem migradas (a arquitetura é compartilhada — basta repetir o ID).
 *
 * Cenários:
 *   1. Aplica filtro → "Limpar" abre modal → Cancelar mantém filtros.
 *   2. Aplica filtro → "Limpar" → Confirmar → toast detalhado aparece.
 *   3. Após confirmar, botão "Desfazer" no toast restaura filtros.
 *   4. Filtros persistem após reload (localStorage-first).
 *
 * Skip controlado quando não há credenciais E2E (CI sem secrets).
 */
import { test, expect } from './helpers/testFixtures';
import { gotoAuthenticated } from './helpers/authSession';

const PAGE_PATH = '/recognition-logs';
const SEARCH_PLACEHOLDER = /buscar pessoa ou câmera/i;
const STORAGE_KEY = 'managed-filters:recognition-logs';

test.describe('Filtros — ciclo confirmar/cancelar/desfazer/persistir (Recognition Logs)', () => {
  test.beforeEach(async ({ page }) => {
    const ok = await gotoAuthenticated(page, PAGE_PATH);
    if (!ok) return;
    // Limpa estado anterior para isolar o teste
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('cancelar a confirmação preserva filtros aplicados', async ({ page }) => {
    const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);
    await expect(search).toBeVisible();
    await search.fill('cancelar-teste');

    // Badge "Filtros ativos" aparece com a busca
    await expect(page.getByText(/filtros ativos/i)).toBeVisible();

    await page.getByRole('button', { name: /^limpar$/i }).click();

    // AlertDialog de confirmação aparece
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/limpar filtros\?/i);
    await expect(dialog).toContainText(/busca/i);

    await dialog.getByRole('button', { name: /cancelar/i }).click();
    await expect(dialog).toBeHidden();

    // Filtro permanece intacto
    await expect(search).toHaveValue('cancelar-teste');
  });

  test('confirmar limpa filtros e mostra toast detalhado com ação Desfazer', async ({ page }) => {
    const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);
    await search.fill('toast-teste');

    await page.getByRole('button', { name: /^limpar$/i }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', { name: /limpar filtros/i }).click();

    // Toast aparece (sonner usa role=status)
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(/filtros limpos/i);
    await expect(toast).toContainText(/busca/i);
    await expect(toast).toContainText(/managed-filters:recognition-logs/i);

    // Botão de undo presente
    await expect(toast.getByRole('button', { name: /desfazer/i })).toBeVisible();

    // Filtro foi limpo
    await expect(search).toHaveValue('');
  });

  test('desfazer restaura o filtro anterior dentro da janela de 10s', async ({ page }) => {
    const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);
    await search.fill('undo-teste');

    await page.getByRole('button', { name: /^limpar$/i }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /limpar filtros/i })
      .click();

    await expect(search).toHaveValue('');

    const toast = page.locator('[data-sonner-toast]').first();
    await toast.getByRole('button', { name: /desfazer/i }).click();

    await expect(search).toHaveValue('undo-teste', { timeout: 5000 });
    // Toast de confirmação do undo
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: /restaurad/i })
    ).toBeVisible();
  });

  test('filtros persistem após reload (localStorage-first)', async ({ page }) => {
    const search = page.getByPlaceholder(SEARCH_PLACEHOLDER);
    await search.fill('persist-teste');

    // Verifica que foi gravado no localStorage
    await expect
      .poll(async () => page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY))
      .toContain('persist-teste');

    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue('persist-teste');
    await expect(page.getByText(/filtros ativos/i)).toBeVisible();
  });
});
