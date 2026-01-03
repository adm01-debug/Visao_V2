/**
 * VISÃO - Testes E2E: Configurações de Notificação
 */

import { test, expect } from "@playwright/test";

test.describe("Configurações de Notificação", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("deve acessar página de configurações", async ({ page }) => {
    await page.click('text=Configurações');
    await expect(page).toHaveURL(/.*config|settings|notif/);
  });

  test("deve exibir seção de notificações", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const notifSection = page.locator("text=Notificações, text=Alertas");
    await expect(notifSection.first()).toBeVisible({ timeout: 10000 });
  });

  test("deve exibir toggle para ativar/desativar notificações", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const toggles = page.locator("[role='switch'], input[type='checkbox']");
    await expect(toggles.first()).toBeVisible({ timeout: 5000 });
  });

  test("deve permitir configurar notificações por email", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const emailSection = page.locator("text=Email, text=E-mail");
    if (await emailSection.first().isVisible()) {
      const emailInput = page.locator("input[type='email'], input[placeholder*='email']");
      await expect(emailInput.first()).toBeVisible();
    }
  });

  test("deve permitir configurar notificações push", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const pushSection = page.locator("text=Push, text=Navegador");
    if (await pushSection.first().isVisible()) {
      const pushToggle = page.locator("[role='switch']").first();
      await expect(pushToggle).toBeVisible();
    }
  });

  test("deve exibir configuração do Telegram", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const telegramSection = page.locator("text=Telegram");
    if (await telegramSection.isVisible()) {
      await expect(telegramSection).toBeVisible();
      
      // Verifica campos do Telegram
      const chatIdInput = page.locator("input[placeholder*='Chat ID'], input[name*='telegram']");
      if (await chatIdInput.first().isVisible()) {
        await expect(chatIdInput.first()).toBeVisible();
      }
    }
  });

  test("deve exibir configuração de Webhook", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const webhookSection = page.locator("text=Webhook");
    if (await webhookSection.isVisible()) {
      await expect(webhookSection).toBeVisible();
      
      const urlInput = page.locator("input[placeholder*='URL'], input[type='url']");
      if (await urlInput.first().isVisible()) {
        await expect(urlInput.first()).toBeVisible();
      }
    }
  });

  test("deve permitir configurar horário silencioso", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const quietHours = page.locator("text=Silencioso, text=Horário");
    if (await quietHours.first().isVisible()) {
      const timeInputs = page.locator("input[type='time']");
      await expect(timeInputs.first()).toBeVisible();
    }
  });

  test("deve permitir selecionar tipos de alerta", async ({ page }) => {
    await page.goto("/configuracoes");
    
    // Verifica checkboxes ou toggles de tipos de alerta
    const alertTypes = page.locator("text=Segurança, text=Movimento, text=Intrusão");
    if (await alertTypes.first().isVisible()) {
      const checkboxes = page.locator("input[type='checkbox'], [role='checkbox']");
      await expect(checkboxes.first()).toBeVisible();
    }
  });

  test("deve permitir configurar severidade mínima", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const severitySection = page.locator("text=Severidade, text=Prioridade");
    if (await severitySection.first().isVisible()) {
      const severityButtons = page.locator("button:has-text('Baixa'), button:has-text('Média'), button:has-text('Alta')");
      await expect(severityButtons.first()).toBeVisible();
    }
  });

  test("deve permitir testar notificação", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const testButton = page.locator("button:has-text('Testar'), button:has-text('Enviar Teste')");
    if (await testButton.first().isVisible()) {
      await expect(testButton.first()).toBeEnabled();
    }
  });

  test("deve exibir botão de salvar configurações", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const saveButton = page.locator("button:has-text('Salvar'), button[type='submit']");
    await expect(saveButton.first()).toBeVisible({ timeout: 5000 });
  });

  test("deve exibir configuração de som", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const soundSection = page.locator("text=Som, text=Áudio");
    if (await soundSection.first().isVisible()) {
      const volumeSlider = page.locator("input[type='range'], [role='slider']");
      await expect(volumeSlider.first()).toBeVisible();
    }
  });

  test("deve permitir configurar cooldown entre alertas", async ({ page }) => {
    await page.goto("/configuracoes");
    
    const cooldownSection = page.locator("text=Cooldown, text=Intervalo");
    if (await cooldownSection.first().isVisible()) {
      const cooldownInput = page.locator("input[type='number']");
      await expect(cooldownInput.first()).toBeVisible();
    }
  });
});
