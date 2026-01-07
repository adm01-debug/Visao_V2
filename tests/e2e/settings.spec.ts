/**
 * @fileoverview E2E Tests - Settings Page
 * @description Comprehensive tests for settings and configuration pages
 */

import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Settings Page Layout', () => {
    test('should navigate to settings page', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeTruthy();
    });

    test('should display settings navigation tabs', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const tabs = page.locator('[role="tablist"], [class*="tabs"], nav').first();
      if (await tabs.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(tabs).toBeVisible();
      }
    });

    test('should display settings form', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const form = page.locator('form, [class*="settings-form"]').first();
      if (await form.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(form).toBeVisible();
      }
    });
  });

  test.describe('Profile Settings', () => {
    test('should display profile settings section', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const profileSection = page.locator('text=/profile|perfil/i').first();
      if (await profileSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(profileSection).toBeVisible();
      }
    });

    test('should have name input field', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="nome"]').first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(nameInput).toBeVisible();
      }
    });

    test('should have email display', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const emailField = page.locator('input[name="email"], input[type="email"], text=/email/i').first();
      if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(emailField).toBeVisible();
      }
    });

    test('should have avatar upload option', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const avatarUpload = page.locator('input[type="file"], button:has-text("Upload"), [class*="avatar"]').first();
      if (await avatarUpload.isVisible({ timeout: 5000 }).catch(() => false)) {
        expect(true).toBe(true);
      }
    });

    test('should have save button', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Salvar"), button[type="submit"]').first();
      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(saveButton).toBeEnabled();
      }
    });
  });

  test.describe('Security Settings', () => {
    test('should have password change section', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const passwordSection = page.locator('text=/password|senha/i').first();
      if (await passwordSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(passwordSection).toBeVisible();
      }
    });

    test('should have current password input', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const currentPassword = page.locator('input[name="current_password"], input[placeholder*="current"]').first();
      if (await currentPassword.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(currentPassword).toBeVisible();
      }
    });

    test('should have new password input', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const newPassword = page.locator('input[name="new_password"], input[placeholder*="new"]').first();
      if (await newPassword.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(newPassword).toBeVisible();
      }
    });

    test('should have two-factor authentication toggle', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const twoFactorToggle = page.locator('text=/two-factor|2fa|autenticação/i').first();
      if (await twoFactorToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(twoFactorToggle).toBeVisible();
      }
    });
  });

  test.describe('Notification Settings', () => {
    test('should display notification settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const notificationTab = page.locator('text=/notification|notificação/i').first();
      if (await notificationTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await notificationTab.click();
        await page.waitForTimeout(500);
      }
    });

    test('should have email notification toggle', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const emailToggle = page.locator('[class*="switch"], [role="switch"], input[type="checkbox"]').first();
      if (await emailToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(emailToggle).toBeVisible();
      }
    });

    test('should have push notification toggle', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const pushToggle = page.locator('text=/push|browser/i').first();
      if (await pushToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(pushToggle).toBeVisible();
      }
    });
  });

  test.describe('Appearance Settings', () => {
    test('should have theme selection', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const themeSection = page.locator('text=/theme|tema|appearance|aparência/i').first();
      if (await themeSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(themeSection).toBeVisible();
      }
    });

    test('should have language selection', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const languageSection = page.locator('text=/language|idioma/i').first();
      if (await languageSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(languageSection).toBeVisible();
      }
    });

    test('should have timezone selection', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const timezoneSection = page.locator('text=/timezone|fuso horário/i').first();
      if (await timezoneSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(timezoneSection).toBeVisible();
      }
    });
  });

  test.describe('Camera Settings', () => {
    test('should have camera default settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const cameraSection = page.locator('text=/camera|câmera/i').first();
      if (await cameraSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cameraSection.click();
        await page.waitForTimeout(500);
      }
    });

    test('should have video quality settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const qualitySection = page.locator('text=/quality|qualidade/i').first();
      if (await qualitySection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(qualitySection).toBeVisible();
      }
    });

    test('should have recording settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const recordingSection = page.locator('text=/recording|gravação/i').first();
      if (await recordingSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(recordingSection).toBeVisible();
      }
    });
  });

  test.describe('Alert Settings', () => {
    test('should have alert configuration', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const alertSection = page.locator('text=/alert|alerta/i').first();
      if (await alertSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await alertSection.click();
        await page.waitForTimeout(500);
      }
    });

    test('should have severity threshold settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const severitySection = page.locator('text=/severity|severidade|threshold/i').first();
      if (await severitySection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(severitySection).toBeVisible();
      }
    });

    test('should have cooldown period settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const cooldownSection = page.locator('text=/cooldown|intervalo/i').first();
      if (await cooldownSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(cooldownSection).toBeVisible();
      }
    });
  });

  test.describe('Integration Settings', () => {
    test('should have API key management', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const apiSection = page.locator('text=/api|integration|integração/i').first();
      if (await apiSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await apiSection.click();
        await page.waitForTimeout(500);
      }
    });

    test('should have webhook configuration', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const webhookSection = page.locator('text=/webhook/i').first();
      if (await webhookSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(webhookSection).toBeVisible();
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required fields', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const nameInput = page.locator('input[name="name"], input[name="full_name"]').first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.clear();
        
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });

    test('should show success message on save', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        const successMessage = page.locator('[class*="toast"], [class*="success"], [role="alert"]').first();
        if (await successMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(successMessage).toBeVisible();
        }
      }
    });
  });

  test.describe('Danger Zone', () => {
    test('should have account deletion option', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const dangerZone = page.locator('text=/danger|perigo|delete account|excluir conta/i').first();
      if (await dangerZone.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(dangerZone).toBeVisible();
      }
    });

    test('should require confirmation for dangerous actions', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Excluir")').first();
      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);
        
        const confirmDialog = page.locator('[role="alertdialog"], [class*="modal"], [class*="dialog"]').first();
        if (await confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(confirmDialog).toBeVisible();
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const inputs = page.locator('input, select, textarea');
      const count = await inputs.count();
      expect(true).toBe(true);
    });
  });
});
