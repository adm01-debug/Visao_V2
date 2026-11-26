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
import type { Page } from '@playwright/test';
import { test, expect } from './helpers/testFixtures';
import { gotoAuthenticated } from './helpers/authSession';

const PAGE_PATH = '/recognition-logs';
const SEARCH_PLACEHOLDER = /buscar pessoa ou câmera/i;
const SCOPE = 'recognition-logs';
const STORAGE_KEY = `managed-filters:${SCOPE}`;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  '';

/** Lê o access_token da sessão gravada pelo global-setup. */
async function sessionToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const key = Object.keys(window.localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!key) return null;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? 'null') as {
        access_token?: string;
        currentSession?: { access_token?: string };
      } | null;
      return parsed?.access_token ?? parsed?.currentSession?.access_token ?? null;
    } catch {
      return null;
    }
  });
}

/**
 * `useManagedFilters` hidrata do localStorage, mas também busca
 * `user_filter_preferences` no Supabase no mount e sobrescreve o estado — por
 * design (preferências seguem o usuário entre dispositivos). Limpar só o
 * storage local deixava a linha remota do teste anterior voltar no meio do
 * teste seguinte e o valor digitado era revertido. Apagar a linha do próprio
 * usuário isola o cenário sem mascarar o comportamento do hook.
 */
async function clearRemotePreferences(page: Page): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const token = await sessionToken(page);
  if (!token) return;
  await page.request.delete(
    `${SUPABASE_URL}/rest/v1/user_filter_preferences?scope=eq.${encodeURIComponent(SCOPE)}`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    }
  );
}

test.describe('Filtros — ciclo confirmar/cancelar/desfazer/persistir (Recognition Logs)', () => {
  test.beforeEach(async ({ page }) => {
    const ok = await gotoAuthenticated(page, PAGE_PATH);
    if (!ok) return;
    // Limpa estado anterior (local + remoto) para isolar o teste
    await clearRemotePreferences(page);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'domcontentloaded' });
    // O boot reidrata do localStorage; sem esperar o input montar, o fill
    // podia acontecer antes da hidratação e ser sobrescrito.
    await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toBeVisible();
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

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue('persist-teste');
    await expect(page.getByText(/filtros ativos/i)).toBeVisible();
  });
});
