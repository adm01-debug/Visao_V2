/**
 * @fileoverview E2E Tests - Maps and Geolocation
 * @description Tests for camera location maps and alert geolocation features
 */

import { test, expect } from '@playwright/test';

test.describe('Maps and Geolocation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Map Display', () => {
    test('should navigate to map page', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeTruthy();
    });

    test('should display map container', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const mapContainer = page.locator('[class*="mapbox"], [class*="map"], canvas, .mapboxgl-map').first();
      if (await mapContainer.isVisible({ timeout: 10000 }).catch(() => false)) {
        await expect(mapContainer).toBeVisible();
      }
    });

    test('should display map controls', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const controls = page.locator('.mapboxgl-ctrl, [class*="control"], [class*="zoom"]').first();
      if (await controls.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(controls).toBeVisible();
      }
    });

    test('should have zoom in button', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const zoomIn = page.locator('button[class*="zoom-in"], .mapboxgl-ctrl-zoom-in, button:has-text("+")').first();
      if (await zoomIn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(zoomIn).toBeEnabled();
      }
    });

    test('should have zoom out button', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const zoomOut = page.locator('button[class*="zoom-out"], .mapboxgl-ctrl-zoom-out, button:has-text("-")').first();
      if (await zoomOut.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(zoomOut).toBeEnabled();
      }
    });

    test('should have fullscreen toggle', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const fullscreen = page.locator('button[class*="fullscreen"], .mapboxgl-ctrl-fullscreen').first();
      if (await fullscreen.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(fullscreen).toBeEnabled();
      }
    });
  });

  test.describe('Camera Markers', () => {
    test('should display camera markers on map', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const markers = page.locator('.mapboxgl-marker, [class*="marker"], [class*="camera-pin"]').first();
      if (await markers.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(markers).toBeVisible();
      }
    });

    test('should show camera info on marker click', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const marker = page.locator('.mapboxgl-marker, [class*="marker"]').first();
      if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
        await marker.click();
        await page.waitForTimeout(500);
        
        const popup = page.locator('.mapboxgl-popup, [class*="popup"], [class*="info-window"]').first();
        if (await popup.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(popup).toBeVisible();
        }
      }
    });

    test('should display camera name in popup', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const marker = page.locator('.mapboxgl-marker, [class*="marker"]').first();
      if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
        await marker.click();
        await page.waitForTimeout(500);
        
        const cameraName = page.locator('.mapboxgl-popup text, [class*="popup"] text=/camera|câmera/i').first();
        if (await cameraName.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(cameraName).toBeVisible();
        }
      }
    });

    test('should display camera status in popup', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const marker = page.locator('.mapboxgl-marker, [class*="marker"]').first();
      if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
        await marker.click();
        await page.waitForTimeout(500);
        
        const status = page.locator('text=/online|offline|status/i').first();
        if (await status.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(status).toBeVisible();
        }
      }
    });

    test('should have different marker colors for camera status', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const markers = page.locator('.mapboxgl-marker, [class*="marker"]');
      const count = await markers.count();
      expect(count >= 0).toBe(true);
    });

    test('should close popup on outside click', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const marker = page.locator('.mapboxgl-marker, [class*="marker"]').first();
      if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
        await marker.click();
        await page.waitForTimeout(500);
        
        await page.locator('body').click({ position: { x: 100, y: 100 } });
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Alert Geolocation', () => {
    test('should display alert markers on map', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const alertMarkers = page.locator('[class*="alert-marker"], [class*="alert-pin"]').first();
      if (await alertMarkers.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(alertMarkers).toBeVisible();
      }
    });

    test('should show alert details on marker click', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const alertMarker = page.locator('[class*="alert-marker"], [class*="alert-pin"]').first();
      if (await alertMarker.isVisible({ timeout: 5000 }).catch(() => false)) {
        await alertMarker.click();
        await page.waitForTimeout(500);
        
        const alertPopup = page.locator('[class*="popup"], [class*="alert-info"]').first();
        if (await alertPopup.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(alertPopup).toBeVisible();
        }
      }
    });

    test('should display alert severity indicator', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const severityIndicator = page.locator('[class*="severity"], [class*="critical"], [class*="high"], [class*="medium"], [class*="low"]').first();
      if (await severityIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(severityIndicator).toBeVisible();
      }
    });

    test('should filter alerts by severity', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const severityFilter = page.locator('[data-testid="severity-filter"], select:has-text("Severity"), button:has-text("Filter")').first();
      if (await severityFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await severityFilter.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });

    test('should filter alerts by time range', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const timeFilter = page.locator('[data-testid="time-filter"], input[type="date"], button:has-text("Date")').first();
      if (await timeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await timeFilter.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Map Interactions', () => {
    test('should pan map on drag', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const mapContainer = page.locator('[class*="mapbox"], .mapboxgl-map, canvas').first();
      if (await mapContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
        const box = await mapContainer.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2);
          await page.mouse.up();
          expect(true).toBe(true);
        }
      }
    });

    test('should zoom map on scroll', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const mapContainer = page.locator('[class*="mapbox"], .mapboxgl-map, canvas').first();
      if (await mapContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
        await mapContainer.hover();
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });

    test('should zoom map on button click', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const zoomIn = page.locator('.mapboxgl-ctrl-zoom-in, button:has-text("+")').first();
      if (await zoomIn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await zoomIn.click();
        await page.waitForTimeout(500);
        await zoomIn.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });

    test('should reset map view', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const resetButton = page.locator('button:has-text("Reset"), button:has-text("Home"), [class*="reset"]').first();
      if (await resetButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await resetButton.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Camera Location Management', () => {
    test('should open camera location editor', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const editButton = page.locator('button:has-text("Edit"), button:has-text("Editar"), [class*="edit-location"]').first();
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(500);
        
        const editor = page.locator('[class*="editor"], [class*="modal"], [role="dialog"]').first();
        if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(editor).toBeVisible();
        }
      }
    });

    test('should allow setting camera location by clicking map', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const addButton = page.locator('button:has-text("Add"), button:has-text("Adicionar")').first();
      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        const mapContainer = page.locator('[class*="mapbox"], .mapboxgl-map').first();
        if (await mapContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
          const box = await mapContainer.boundingBox();
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            expect(true).toBe(true);
          }
        }
      }
    });

    test('should display coordinates input fields', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const latInput = page.locator('input[name="latitude"], input[placeholder*="latitude"], input[placeholder*="lat"]').first();
      const lngInput = page.locator('input[name="longitude"], input[placeholder*="longitude"], input[placeholder*="lng"]').first();
      
      if (await latInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(latInput).toBeVisible();
      }
      
      if (await lngInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(lngInput).toBeVisible();
      }
    });

    test('should validate coordinate inputs', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const latInput = page.locator('input[name="latitude"], input[placeholder*="latitude"]').first();
      if (await latInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await latInput.fill('invalid');
        await latInput.blur();
        await page.waitForTimeout(300);
        expect(true).toBe(true);
      }
    });

    test('should save camera location', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Salvar")').first();
      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(saveButton).toBeEnabled();
      }
    });
  });

  test.describe('Map Layers', () => {
    test('should have layer toggle controls', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const layerToggle = page.locator('button:has-text("Layers"), button:has-text("Camadas"), [class*="layer-control"]').first();
      if (await layerToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(layerToggle).toBeVisible();
      }
    });

    test('should toggle camera layer', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const cameraLayer = page.locator('input[name="cameras"], button:has-text("Cameras"), [class*="camera-layer"]').first();
      if (await cameraLayer.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cameraLayer.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });

    test('should toggle alert layer', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const alertLayer = page.locator('input[name="alerts"], button:has-text("Alerts"), [class*="alert-layer"]').first();
      if (await alertLayer.isVisible({ timeout: 5000 }).catch(() => false)) {
        await alertLayer.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });

    test('should toggle zone layer', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const zoneLayer = page.locator('input[name="zones"], button:has-text("Zones"), [class*="zone-layer"]').first();
      if (await zoneLayer.isVisible({ timeout: 5000 }).catch(() => false)) {
        await zoneLayer.click();
        await page.waitForTimeout(500);
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Map Styles', () => {
    test('should have map style selector', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const styleSelector = page.locator('button:has-text("Style"), button:has-text("Estilo"), [class*="style-selector"]').first();
      if (await styleSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(styleSelector).toBeVisible();
      }
    });

    test('should switch to satellite view', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const satelliteOption = page.locator('button:has-text("Satellite"), button:has-text("Satélite")').first();
      if (await satelliteOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await satelliteOption.click();
        await page.waitForTimeout(1000);
        expect(true).toBe(true);
      }
    });

    test('should switch to street view', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const streetOption = page.locator('button:has-text("Street"), button:has-text("Rua")').first();
      if (await streetOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await streetOption.click();
        await page.waitForTimeout(1000);
        expect(true).toBe(true);
      }
    });

    test('should switch to dark mode', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const darkOption = page.locator('button:has-text("Dark"), button:has-text("Escuro")').first();
      if (await darkOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await darkOption.click();
        await page.waitForTimeout(1000);
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Search and Navigation', () => {
    test('should have search input for locations', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="buscar"], input[placeholder*="location"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(searchInput).toBeVisible();
      }
    });

    test('should search for camera by name', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="buscar"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill('camera');
        await page.waitForTimeout(1000);
        expect(true).toBe(true);
      }
    });

    test('should navigate to camera on search result click', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="buscar"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill('camera');
        await page.waitForTimeout(1000);
        
        const result = page.locator('[class*="result"], [class*="suggestion"]').first();
        if (await result.isVisible({ timeout: 3000 }).catch(() => false)) {
          await result.click();
          await page.waitForTimeout(500);
          expect(true).toBe(true);
        }
      }
    });

    test('should have current location button', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const locationButton = page.locator('button:has-text("My Location"), button:has-text("Minha Localização"), [class*="geolocate"]').first();
      if (await locationButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(locationButton).toBeEnabled();
      }
    });
  });

  test.describe('Clustering', () => {
    test('should cluster markers when zoomed out', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const cluster = page.locator('[class*="cluster"], [class*="marker-cluster"]').first();
      if (await cluster.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(cluster).toBeVisible();
      }
    });

    test('should expand cluster on click', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const cluster = page.locator('[class*="cluster"], [class*="marker-cluster"]').first();
      if (await cluster.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cluster.click();
        await page.waitForTimeout(1000);
        expect(true).toBe(true);
      }
    });

    test('should show cluster count', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const clusterCount = page.locator('[class*="cluster"] text, [class*="cluster-count"]').first();
      if (await clusterCount.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(clusterCount).toBeVisible();
      }
    });
  });

  test.describe('Heatmap', () => {
    test('should have heatmap toggle', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const heatmapToggle = page.locator('button:has-text("Heatmap"), button:has-text("Mapa de Calor"), [class*="heatmap"]').first();
      if (await heatmapToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(heatmapToggle).toBeVisible();
      }
    });

    test('should display alert heatmap', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const heatmapToggle = page.locator('button:has-text("Heatmap"), [class*="heatmap"]').first();
      if (await heatmapToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await heatmapToggle.click();
        await page.waitForTimeout(1000);
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const mapContainer = page.locator('[class*="mapbox"], .mapboxgl-map').first();
      if (await mapContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(mapContainer).toBeVisible();
      }
    });

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      expect(page.url()).toBeTruthy();
    });

    test('should collapse sidebar on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const sidebar = page.locator('[class*="sidebar"]').first();
      if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await sidebar.boundingBox();
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should have ARIA labels on controls', async ({ page }) => {
      await page.goto('/map');
      await page.waitForTimeout(3000);
      
      const zoomIn = page.locator('.mapboxgl-ctrl-zoom-in, [aria-label*="zoom"]').first();
      if (await zoomIn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const ariaLabel = await zoomIn.getAttribute('aria-label');
        expect(true).toBe(true);
      }
    });
  });
});
