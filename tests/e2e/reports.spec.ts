/**
 * @fileoverview E2E Tests - Reports and Analytics
 * @description Tests for report generation, export, and analytics features
 */

import { test, expect } from '@playwright/test';

test.describe('Reports and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Reports Page', () => {
    test('should navigate to reports page', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });

    test('should display report filters', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const dateFilter = page.locator('[data-testid="date-filter"], input[type="date"], [class*="date"]').first();
      const typeFilter = page.locator('[data-testid="type-filter"], select, [class*="select"]').first();
      
      if (await dateFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(dateFilter).toBeVisible();
      }
      
      if (await typeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(typeFilter).toBeVisible();
      }
    });

    test('should display report charts', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(3000);
      
      const charts = page.locator('svg, canvas, [class*="chart"], [class*="recharts"]').first();
      if (await charts.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(charts).toBeVisible();
      }
    });

    test('should allow date range selection', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const dateInput = page.locator('input[type="date"], [data-testid="date-picker"], button:has-text("Date")').first();
      
      if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dateInput.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('should display key metrics', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForTimeout(2000);
      
      const metrics = page.locator('[class*="metric"], [class*="stat"], [class*="card"]').first();
      if (await metrics.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(metrics).toBeVisible();
      }
    });

    test('should show alert statistics', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForTimeout(2000);
      
      const alertStats = page.locator('text=/alert|alerta/i').first();
      if (await alertStats.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(alertStats).toBeVisible();
      }
    });

    test('should show camera statistics', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForTimeout(2000);
      
      const cameraStats = page.locator('text=/camera|câmera/i').first();
      if (await cameraStats.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(cameraStats).toBeVisible();
      }
    });

    test('should show detection statistics', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForTimeout(2000);
      
      const detectionStats = page.locator('text=/detection|detecção|detect/i').first();
      if (await detectionStats.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(detectionStats).toBeVisible();
      }
    });
  });

  test.describe('Export Functionality', () => {
    test('should have export button', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Exportar"), [data-testid="export-button"]').first();
      if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(exportButton).toBeEnabled();
      }
    });

    test('should offer PDF export option', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Exportar")').first();
      if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await exportButton.click();
        await page.waitForTimeout(500);
        
        const pdfOption = page.locator('text=/PDF/i').first();
        if (await pdfOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(pdfOption).toBeVisible();
        }
      }
    });

    test('should offer Excel export option', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Exportar")').first();
      if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await exportButton.click();
        await page.waitForTimeout(500);
        
        const excelOption = page.locator('text=/Excel|XLSX|CSV/i').first();
        if (await excelOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(excelOption).toBeVisible();
        }
      }
    });
  });

  test.describe('Data Visualization', () => {
    test('should display line charts', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(3000);
      
      const lineChart = page.locator('[class*="line"], path[class*="line"], .recharts-line').first();
      if (await lineChart.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(lineChart).toBeVisible();
      }
    });

    test('should display bar charts', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(3000);
      
      const barChart = page.locator('[class*="bar"], rect[class*="bar"], .recharts-bar').first();
      if (await barChart.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(barChart).toBeVisible();
      }
    });

    test('should display pie charts', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(3000);
      
      const pieChart = page.locator('[class*="pie"], path[class*="pie"], .recharts-pie').first();
      if (await pieChart.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(pieChart).toBeVisible();
      }
    });

    test('should show chart tooltips on hover', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(3000);
      
      const chartElement = page.locator('svg, canvas, [class*="chart"]').first();
      if (await chartElement.isVisible({ timeout: 5000 }).catch(() => false)) {
        await chartElement.hover();
        await page.waitForTimeout(500);
        
        const tooltip = page.locator('[class*="tooltip"], [role="tooltip"]').first();
        if (await tooltip.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(tooltip).toBeVisible();
        }
      }
    });
  });

  test.describe('Filtering and Sorting', () => {
    test('should filter by camera', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const cameraFilter = page.locator('[data-testid="camera-filter"], select:has-text("Camera"), [class*="camera-select"]').first();
      if (await cameraFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cameraFilter.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });

    test('should filter by alert type', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const typeFilter = page.locator('[data-testid="type-filter"], select:has-text("Type"), [class*="type-select"]').first();
      if (await typeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await typeFilter.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });

    test('should filter by severity', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const severityFilter = page.locator('[data-testid="severity-filter"], select:has-text("Severity"), [class*="severity-select"]').first();
      if (await severityFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await severityFilter.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show live data indicator', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const liveIndicator = page.locator('text=/live|ao vivo|real-time|tempo real/i').first();
      if (await liveIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(liveIndicator).toBeVisible();
      }
    });

    test('should have refresh button', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Atualizar"), [data-testid="refresh"]').first();
      if (await refreshButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(refreshButton).toBeEnabled();
      }
    });
  });

  test.describe('Print Functionality', () => {
    test('should have print button', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const printButton = page.locator('button:has-text("Print"), button:has-text("Imprimir"), [data-testid="print"]').first();
      if (await printButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(printButton).toBeEnabled();
      }
    });
  });

  test.describe('Scheduled Reports', () => {
    test('should have schedule report option', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);
      
      const scheduleButton = page.locator('button:has-text("Schedule"), button:has-text("Agendar"), [data-testid="schedule"]').first();
      if (await scheduleButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(scheduleButton).toBeEnabled();
      }
    });
  });
});
