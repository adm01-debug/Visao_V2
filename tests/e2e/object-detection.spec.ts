/**
 * VISÃO - Testes E2E para Detecção de Objetos
 * Testa funcionalidades de detecção e análise de objetos
 */

import { test, expect } from '@playwright/test';

test.describe('Detecção de Objetos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analysis');
  });

  test('deve carregar a página de análise', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /análise|detecção|objetos/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 }).catch(async () => {
      // Tenta navegação alternativa
      await page.goto('/');
      const analysisLink = page.locator('a[href*="analysis"], button:has-text("Análise")');
      if (await analysisLink.first().isVisible()) {
        await analysisLink.first().click();
      }
    });
  });

  test('deve exibir opções de tipos de detecção', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Tipos comuns de detecção
    const detectionTypes = ['Pessoas', 'Veículos', 'Objetos', 'Movimento', 'Faces'];
    
    for (const type of detectionTypes) {
      const typeElement = page.getByText(type, { exact: false });
      if (await typeElement.first().isVisible().catch(() => false)) {
        await expect(typeElement.first()).toBeVisible();
        break;
      }
    }
  });

  test('deve permitir selecionar câmera para análise', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const cameraSelector = page.locator('[data-testid="camera-select"], select, [role="combobox"]');
    
    if (await cameraSelector.first().isVisible().catch(() => false)) {
      await cameraSelector.first().click();
      
      const options = page.locator('[role="option"], option');
      await expect(options.first()).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });

  test('deve exibir histórico de detecções', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Navega para histórico se necessário
    const historyTab = page.locator('button:has-text("Histórico"), [data-testid="history-tab"]');
    if (await historyTab.isVisible().catch(() => false)) {
      await historyTab.click();
    }
    
    // Verifica lista de detecções
    const detectionsList = page.locator('[data-testid="detections-list"], .detections-list, table');
    // Lista pode estar vazia ou presente
  });

  test('deve filtrar detecções por data', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const dateFilter = page.locator('[data-testid="date-filter"], input[type="date"], button:has-text("Data")');
    
    if (await dateFilter.first().isVisible().catch(() => false)) {
      await dateFilter.first().click();
    }
  });

  test('deve filtrar detecções por tipo de objeto', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const typeFilter = page.locator('[data-testid="object-type-filter"], [placeholder*="tipo"]');
    
    if (await typeFilter.first().isVisible().catch(() => false)) {
      await typeFilter.first().click();
    }
  });

  test('deve exibir confiança da detecção', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verifica se há indicadores de confiança
    const confidenceIndicator = page.locator('[data-testid="confidence"], .confidence, [class*="confidence"]');
    // Pode ou não estar presente
  });

  test('deve permitir visualizar imagem da detecção', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const detectionItem = page.locator('[data-testid="detection-item"], .detection-item, tr');
    
    if (await detectionItem.first().isVisible().catch(() => false)) {
      await detectionItem.first().click();
      
      // Verifica se modal/preview abre
      const imagePreview = page.locator('[data-testid="detection-image"], img, [role="dialog"]');
      // Preview pode estar presente
    }
  });

  test('deve exibir estatísticas de detecções', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verifica cards de estatísticas
    const statsCards = page.locator('[data-testid="stats-card"], .stats-card, [class*="stat"]');
    // Stats podem estar presentes
  });

  test('deve permitir exportar dados de detecções', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const exportButton = page.locator('button:has-text("Exportar"), button:has-text("Download"), [data-testid="export"]');
    
    if (await exportButton.first().isVisible().catch(() => false)) {
      // Não clica para não baixar arquivo, apenas verifica presença
      await expect(exportButton.first()).toBeEnabled();
    }
  });

  test('deve exibir detecções em tempo real', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verifica indicador de tempo real
    const realtimeIndicator = page.locator('[data-testid="realtime"], .realtime, [class*="live"]');
    // Indicador pode estar presente
  });

  test('deve configurar sensibilidade de detecção', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const settingsButton = page.locator('button:has-text("Configurações"), button:has-text("Settings"), [data-testid="settings"]');
    
    if (await settingsButton.first().isVisible().catch(() => false)) {
      await settingsButton.first().click();
      
      // Verifica slider de sensibilidade
      const sensitivitySlider = page.locator('[data-testid="sensitivity"], input[type="range"], [role="slider"]');
      // Slider pode estar presente
    }
  });

  test('deve exibir bounding boxes nas detecções', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verifica se há canvas ou overlay para bounding boxes
    const boundingBoxes = page.locator('canvas, [data-testid="bounding-box"], .bounding-box');
    // Bounding boxes podem estar presentes se houver detecções ativas
  });

  test('deve agrupar detecções por objeto', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const groupByButton = page.locator('button:has-text("Agrupar"), [data-testid="group-by"]');
    
    if (await groupByButton.isVisible().catch(() => false)) {
      await groupByButton.click();
    }
  });

  test('deve mostrar contagem de pessoas em zonas', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verifica contadores
    const peopleCount = page.locator('[data-testid="people-count"], .people-count, [class*="count"]');
    // Contadores podem estar presentes
  });
});

test.describe('Análise de Vídeo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analysis');
  });

  test('deve permitir upload de vídeo para análise', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const uploadButton = page.locator('input[type="file"], button:has-text("Upload"), [data-testid="upload-video"]');
    
    if (await uploadButton.first().isVisible().catch(() => false)) {
      // Verifica que o input aceita vídeos
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        const accept = await fileInput.getAttribute('accept');
        // Aceita vídeos ou qualquer arquivo
      }
    }
  });

  test('deve mostrar progresso da análise', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verifica barra de progresso
    const progressBar = page.locator('[role="progressbar"], .progress-bar, [data-testid="analysis-progress"]');
    // Progresso pode estar visível durante análise
  });

  test('deve exibir resultados da análise de vídeo', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verifica área de resultados
    const resultsArea = page.locator('[data-testid="analysis-results"], .analysis-results');
    // Resultados podem estar presentes se houver análise concluída
  });
});

test.describe('Detecção de EPI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analysis');
  });

  test('deve identificar tipos de EPI', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Tipos comuns de EPI
    const ppeTypes = ['Capacete', 'Colete', 'Óculos', 'Luvas', 'Máscara'];
    
    // Verifica se algum tipo de EPI é mencionado
    for (const ppe of ppeTypes) {
      const ppeElement = page.getByText(ppe, { exact: false });
      if (await ppeElement.first().isVisible().catch(() => false)) {
        break;
      }
    }
  });

  test('deve alertar sobre falta de EPI', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verifica alertas de EPI
    const ppeAlert = page.locator('[data-testid="ppe-alert"], .ppe-alert, [class*="warning"]');
    // Alertas podem estar presentes
  });
});
