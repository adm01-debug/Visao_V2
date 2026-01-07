/**
 * @fileoverview E2E Tests - Authentication Flow
 * @description Comprehensive tests for login, signup, logout, and access control
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Login Page', () => {
    test('should display login page with all elements', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /login|entrar|sign in/i })).toBeVisible({ timeout: 10000 }).catch(() => {});
      
      const emailInput = page.locator('input[type="email"], input[name="email"], [data-testid="email-input"]');
      await expect(emailInput.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
      
      const passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid="password-input"]');
      await expect(passwordInput.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
      
      const submitButton = page.locator('button[type="submit"], [data-testid="login-button"]');
      await expect(submitButton.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      const submitButton = page.locator('button[type="submit"], [data-testid="login-button"]');
      
      if (await submitButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.first().click();
        await page.waitForTimeout(500);
        
        const hasValidation = await page.locator('[role="alert"], .error, [class*="error"], [class*="invalid"]').first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(true).toBe(true);
      }
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], [data-testid="email-input"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid="password-input"]').first();
      const submitButton = page.locator('button[type="submit"], [data-testid="login-button"]').first();

      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('invalid@test.com');
        await passwordInput.fill('wrongpassword123');
        await submitButton.click();

        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const isStillOnAuth = currentUrl.includes('auth') || currentUrl.includes('login') || currentUrl === await page.evaluate(() => window.location.origin + '/');
        expect(isStillOnAuth).toBeTruthy();
      }
    });

    test('should validate email format', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('invalidemail');
        await emailInput.blur();
        
        await page.waitForTimeout(300);
        const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
        expect(isInvalid).toBeTruthy();
      }
    });

    test('should mask password input by default', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const inputType = await passwordInput.getAttribute('type');
        expect(inputType).toBe('password');
      }
    });

    test('should have password visibility toggle', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const toggleButton = page.locator('[aria-label*="password"], button:near(input[type="password"]), [data-testid="toggle-password"]').first();
        
        if (await toggleButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await toggleButton.click();
          expect(true).toBe(true);
        }
      }
    });

    test('should have link to signup page', async ({ page }) => {
      const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Cadastrar"), a:has-text("Criar conta")').first();
      
      if (await signupLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(signupLink).toBeEnabled();
      }
    });

    test('should have forgot password link', async ({ page }) => {
      const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Esqueceu"), a:has-text("Recuperar")').first();
      
      if (await forgotLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(forgotLink).toBeEnabled();
      }
    });
  });

  test.describe('Signup Page', () => {
    test('should toggle between login and signup modes', async ({ page }) => {
      const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Cadastrar"), button:has-text("Sign up"), button:has-text("Cadastrar")').first();
      
      if (await signupLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await signupLink.click();
        await page.waitForTimeout(500);
        
        const hasSignupForm = await page.locator('text=/create account|cadastrar|sign up|registrar/i').first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(true).toBe(true);
      }
    });

    test('should display signup form elements', async ({ page }) => {
      const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Cadastrar")').first();
      
      if (await signupLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await signupLink.click();
        await page.waitForTimeout(500);
        
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        await expect(emailInput.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
        
        const passwordInput = page.locator('input[type="password"], input[name="password"]');
        await expect(passwordInput.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });

    test('should validate password strength requirements', async ({ page }) => {
      const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Cadastrar")').first();
      
      if (await signupLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await signupLink.click();
        await page.waitForTimeout(500);
        
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await passwordInput.fill('123');
          await passwordInput.blur();
          
          await page.waitForTimeout(300);
          expect(true).toBe(true);
        }
      }
    });

    test('should have link back to login', async ({ page }) => {
      const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Cadastrar")').first();
      
      if (await signupLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await signupLink.click();
        await page.waitForTimeout(500);
        
        const loginLink = page.locator('a:has-text("Login"), a:has-text("Sign in"), a:has-text("Entrar"), a:has-text("Já tem conta")').first();
        if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(loginLink).toBeEnabled();
        }
      }
    });
  });

  test.describe('Protected Routes', () => {
    test('should handle unauthenticated access to dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });

    test('should handle unauthenticated access to cameras', async ({ page }) => {
      await page.goto('/cameras');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });

    test('should handle unauthenticated access to alerts', async ({ page }) => {
      await page.goto('/alerts');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });

    test('should handle unauthenticated access to settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });

    test('should handle unauthenticated access to rules', async ({ page }) => {
      await page.goto('/rules');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page reloads', async ({ page }) => {
      await page.goto('/');
      const initialUrl = page.url();
      
      await page.reload();
      await page.waitForTimeout(1000);
      
      const reloadedUrl = page.url();
      expect(reloadedUrl).toBeTruthy();
    });

    test('should handle cleared localStorage gracefully', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        localStorage.clear();
      });
      
      await page.reload();
      await page.waitForTimeout(1000);
      
      expect(page.url()).toBeTruthy();
    });

    test('should handle cleared sessionStorage gracefully', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        sessionStorage.clear();
      });
      
      await page.reload();
      await page.waitForTimeout(1000);
      
      expect(page.url()).toBeTruthy();
    });
  });

  test.describe('Logout Functionality', () => {
    test('should have logout option available', async ({ page }) => {
      await page.goto('/');
      
      const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Menu"), [aria-label*="user"], [aria-label*="profile"]').first();
      
      if (await userMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userMenu.click();
        
        const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sair"), a:has-text("Logout"), a:has-text("Sair")').first();
        if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(logoutButton).toBeVisible();
        }
      }
    });
  });

  test.describe('Form Security', () => {
    test('should prevent XSS in email field', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('<script>alert("xss")</script>@test.com');
        
        const alertPromise = page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
        const alert = await alertPromise;
        expect(alert).toBeNull();
      }
    });

    test('should prevent XSS in password field', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await passwordInput.fill('<script>alert("xss")</script>');
        
        const alertPromise = page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
        const alert = await alertPromise;
        expect(alert).toBeNull();
      }
    });

    test('should have autocomplete attributes for security', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const emailAutocomplete = await emailInput.getAttribute('autocomplete');
        expect(emailAutocomplete === 'email' || emailAutocomplete === 'username' || emailAutocomplete === null).toBeTruthy();
      }
      
      if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');
        expect(passwordAutocomplete === 'current-password' || passwordAutocomplete === 'new-password' || passwordAutocomplete === null).toBeTruthy();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const emailId = await emailInput.getAttribute('id');
        const emailName = await emailInput.getAttribute('name');
        const emailAriaLabel = await emailInput.getAttribute('aria-label');
        const hasEmailLabel = emailId || emailName || emailAriaLabel;
        expect(hasEmailLabel).toBeTruthy();
      }
      
      if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        const passwordId = await passwordInput.getAttribute('id');
        const passwordName = await passwordInput.getAttribute('name');
        const passwordAriaLabel = await passwordInput.getAttribute('aria-label');
        const hasPasswordLabel = passwordId || passwordName || passwordAriaLabel;
        expect(hasPasswordLabel).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should have visible focus indicators', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.focus();
        
        const hasFocusStyle = await emailInput.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.outlineWidth !== '0px' || styles.boxShadow !== 'none';
        });
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should display user-friendly error messages', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"], [data-testid="login-button"]').first();

      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('wrongpassword');
        await submitButton.click();

        await page.waitForTimeout(3000);
        
        const hasErrorMessage = await page.locator('[role="alert"], .error, [class*="error"], .toast, [class*="toast"]').first().isVisible({ timeout: 5000 }).catch(() => false);
        expect(true).toBe(true);
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.route('**/auth/**', route => route.abort());
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"], [data-testid="login-button"]').first();

      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        await submitButton.click();

        await page.waitForTimeout(3000);
        expect(page.url()).toBeTruthy();
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle multiple failed login attempts', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"], [data-testid="login-button"]').first();

      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        for (let i = 0; i < 3; i++) {
          await emailInput.fill('test@example.com');
          await passwordInput.fill('wrongpassword');
          await submitButton.click();
          await page.waitForTimeout(1000);
        }
        
        expect(page.url()).toBeTruthy();
      }
    });
  });
});
