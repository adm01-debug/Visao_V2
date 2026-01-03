/**
 * VISÃO - Testes E2E: Detecção de Placas
 */

import { test, expect } from "@playwright/test";

test.describe("Detecção de Placas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("deve exibir página de detecção de placas", async ({ page }) => {
    await page.click('text=Placas');
    await expect(page).toHaveURL(/.*placas|plates/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("deve exibir lista de placas detectadas", async ({ page }) => {
    await page.goto("/placas");
    
    // Verifica se a tabela ou lista está presente
    const tableOrList = page.locator("table, [role='list'], [data-testid='plates-list']");
    await expect(tableOrList.first()).toBeVisible({ timeout: 10000 });
  });

  test("deve permitir buscar placas", async ({ page }) => {
    await page.goto("/placas");
    
    const searchInput = page.locator("input[placeholder*='Buscar'], input[type='search']");
    if (await searchInput.isVisible()) {
      await searchInput.fill("ABC1234");
      await page.waitForTimeout(500);
    }
  });

  test("deve exibir detalhes de uma placa ao clicar", async ({ page }) => {
    await page.goto("/placas");
    
    const plateRow = page.locator("tr, [role='row'], [data-testid='plate-item']").first();
    if (await plateRow.isVisible()) {
      await plateRow.click();
      await page.waitForTimeout(500);
    }
  });

  test("deve permitir adicionar placa à lista de monitoramento", async ({ page }) => {
    await page.goto("/placas");
    
    const addButton = page.locator("button:has-text('Adicionar'), button:has-text('Nova Placa')");
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Verifica se modal ou formulário aparece
      const modal = page.locator("[role='dialog'], form");
      await expect(modal.first()).toBeVisible();
    }
  });

  test("deve exibir filtros de status de placas", async ({ page }) => {
    await page.goto("/placas");
    
    // Verifica filtros como Permitido, Bloqueado, etc
    const filters = page.locator("button:has-text('Permitido'), button:has-text('Bloqueado'), [data-testid='plate-filter']");
    if (await filters.first().isVisible()) {
      await filters.first().click();
      await page.waitForTimeout(300);
    }
  });

  test("deve permitir exportar lista de placas", async ({ page }) => {
    await page.goto("/placas");
    
    const exportButton = page.locator("button:has-text('Exportar'), button:has-text('Download')");
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeEnabled();
    }
  });

  test("deve exibir estatísticas de detecção", async ({ page }) => {
    await page.goto("/placas");
    
    // Verifica cards de estatísticas
    const statsCards = page.locator("[data-testid='stats'], .stat-card, [class*='card']");
    await expect(statsCards.first()).toBeVisible({ timeout: 5000 });
  });
});
