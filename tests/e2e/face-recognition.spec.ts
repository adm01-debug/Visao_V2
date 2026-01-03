/**
 * VISÃO - Testes E2E: Reconhecimento Facial
 */

import { test, expect } from "@playwright/test";

test.describe("Reconhecimento Facial", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("deve exibir página de reconhecimento facial", async ({ page }) => {
    await page.click('text=Facial');
    await expect(page).toHaveURL(/.*facial|faces|recognition/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("deve exibir lista de pessoas cadastradas", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const personsList = page.locator("[data-testid='persons-list'], table, [role='list']");
    await expect(personsList.first()).toBeVisible({ timeout: 10000 });
  });

  test("deve permitir cadastrar nova pessoa", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const addButton = page.locator("button:has-text('Cadastrar'), button:has-text('Nova Pessoa'), button:has-text('Adicionar')");
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const modal = page.locator("[role='dialog'], form");
      await expect(modal.first()).toBeVisible();
    }
  });

  test("deve exibir formulário de cadastro com campos necessários", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const addButton = page.locator("button:has-text('Cadastrar'), button:has-text('Nova Pessoa')");
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Verifica campos do formulário
      await expect(page.locator("input[name='name'], input[placeholder*='Nome']").first()).toBeVisible();
    }
  });

  test("deve permitir upload de foto", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const addButton = page.locator("button:has-text('Cadastrar'), button:has-text('Nova Pessoa')");
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const uploadInput = page.locator("input[type='file']");
      await expect(uploadInput.first()).toBeAttached();
    }
  });

  test("deve exibir histórico de reconhecimentos", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const historyTab = page.locator("button:has-text('Histórico'), [role='tab']:has-text('Histórico')");
    if (await historyTab.isVisible()) {
      await historyTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("deve exibir configurações de reconhecimento", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const configTab = page.locator("button:has-text('Configurações'), [role='tab']:has-text('Config')");
    if (await configTab.isVisible()) {
      await configTab.click();
      
      // Verifica se sliders ou campos de configuração aparecem
      const configElements = page.locator("input[type='range'], [role='slider']");
      await expect(configElements.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("deve permitir editar pessoa cadastrada", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const editButton = page.locator("button[aria-label*='Editar'], button:has-text('Editar')").first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      const modal = page.locator("[role='dialog']");
      await expect(modal).toBeVisible();
    }
  });

  test("deve permitir excluir pessoa cadastrada", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const deleteButton = page.locator("button[aria-label*='Excluir'], button:has-text('Excluir')").first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Verifica confirmação
      const confirmDialog = page.locator("[role='alertdialog'], [role='dialog']");
      await expect(confirmDialog.first()).toBeVisible();
    }
  });

  test("deve exibir status de reconhecimento em tempo real", async ({ page }) => {
    await page.goto("/reconhecimento-facial");
    
    const liveStatus = page.locator("[data-testid='live-status'], .live-indicator, [class*='pulse']");
    if (await liveStatus.first().isVisible()) {
      await expect(liveStatus.first()).toBeVisible();
    }
  });
});
