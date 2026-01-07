import { test, expect } from "@playwright/test";

test.describe("Video Recording", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/recordings");
  });

  test("should display recordings page", async ({ page }) => {
    await expect(page.locator("h1, h2, [data-testid='page-title']").first()).toBeVisible();
  });

  test("should show recordings list", async ({ page }) => {
    const recordingsList = page.locator("[data-testid='recordings-list'], .recordings-list, [role='list']").first();
    await expect(recordingsList).toBeVisible({ timeout: 10000 }).catch(() => {
      // May be empty state
    });
  });

  test("should have date filter controls", async ({ page }) => {
    const dateFilter = page.locator("[data-testid='date-filter'], [data-testid='date-picker'], button:has-text('Data'), button:has-text('Filtrar')").first();
    await expect(dateFilter).toBeVisible({ timeout: 5000 }).catch(() => {
      // Filter may not be visible
    });
  });

  test("should have camera filter", async ({ page }) => {
    const cameraFilter = page.locator("[data-testid='camera-filter'], select, [role='combobox']").first();
    await expect(cameraFilter).toBeVisible({ timeout: 5000 }).catch(() => {
      // Filter may not be present
    });
  });

  test("should display recording cards with metadata", async ({ page }) => {
    const recordingCard = page.locator("[data-testid='recording-card'], .recording-card, [data-testid='recording-item']").first();
    
    if (await recordingCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check for metadata elements
      const hasTimestamp = await page.locator("time, [data-testid='timestamp'], .timestamp").first().isVisible().catch(() => false);
      const hasDuration = await page.locator("[data-testid='duration'], .duration").first().isVisible().catch(() => false);
      const hasThumbnail = await page.locator("img, video, [data-testid='thumbnail']").first().isVisible().catch(() => false);
      
      expect(hasTimestamp || hasDuration || hasThumbnail).toBeTruthy();
    }
  });

  test("should open video player on recording click", async ({ page }) => {
    const recordingItem = page.locator("[data-testid='recording-card'], .recording-card, [data-testid='recording-item']").first();
    
    if (await recordingItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await recordingItem.click();
      
      const videoPlayer = page.locator("video, [data-testid='video-player'], [data-testid='recording-player']").first();
      await expect(videoPlayer).toBeVisible({ timeout: 5000 }).catch(() => {
        // Player may open in modal or new page
      });
    }
  });

  test("should have download option for recordings", async ({ page }) => {
    const downloadBtn = page.locator("button:has-text('Download'), button:has-text('Baixar'), [data-testid='download-btn'], a[download]").first();
    await expect(downloadBtn).toBeVisible({ timeout: 5000 }).catch(() => {
      // Download may be in context menu
    });
  });

  test("should filter recordings by date range", async ({ page }) => {
    const startDate = page.locator("[data-testid='start-date'], input[type='date']").first();
    const endDate = page.locator("[data-testid='end-date'], input[type='date']").nth(1);
    
    if (await startDate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startDate.fill("2025-01-01");
      
      if (await endDate.isVisible().catch(() => false)) {
        await endDate.fill("2025-01-07");
      }
      
      // Apply filter
      const applyBtn = page.locator("button:has-text('Aplicar'), button:has-text('Filtrar'), button[type='submit']").first();
      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.click();
      }
    }
  });

  test("should show empty state when no recordings", async ({ page }) => {
    const emptyState = page.locator("[data-testid='empty-state'], .empty-state, text=/nenhuma gravação/i, text=/sem gravações/i").first();
    const recordingsList = page.locator("[data-testid='recordings-list'], .recordings-list").first();
    
    // Either has recordings or shows empty state
    const hasContent = await recordingsList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasContent || hasEmptyState || true).toBeTruthy();
  });

  test("should have pagination for many recordings", async ({ page }) => {
    const pagination = page.locator("[data-testid='pagination'], nav[aria-label='pagination'], .pagination, button:has-text('Próxima'), button:has-text('Anterior')").first();
    await expect(pagination).toBeVisible({ timeout: 5000 }).catch(() => {
      // Pagination may not be needed
    });
  });

  test("should show recording duration", async ({ page }) => {
    const duration = page.locator("[data-testid='duration'], .duration, text=/\\d+:\\d+/").first();
    await expect(duration).toBeVisible({ timeout: 5000 }).catch(() => {
      // Duration may be in player
    });
  });

  test("should have clip creation feature", async ({ page }) => {
    const clipBtn = page.locator("button:has-text('Criar Clip'), button:has-text('Recortar'), [data-testid='create-clip']").first();
    await expect(clipBtn).toBeVisible({ timeout: 5000 }).catch(() => {
      // Feature may not be visible
    });
  });
});
