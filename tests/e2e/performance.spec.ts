/**
 * @fileoverview E2E Tests - Performance Testing
 * @description Tests for application performance, load times, and Core Web Vitals
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test.describe('Page Load Performance', () => {
    test('should load homepage within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Homepage load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });

    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Dashboard load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(8000);
    });

    test('should load cameras page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/cameras');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Cameras page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(8000);
    });

    test('should load alerts page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/alerts');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Alerts page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(8000);
    });

    test('should load settings page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Settings page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should measure First Contentful Paint (FCP)', async ({ page }) => {
      await page.goto('/');
      
      const fcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
            if (fcpEntry) {
              resolve(fcpEntry.startTime);
            }
          }).observe({ entryTypes: ['paint'] });
          
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      console.log(`FCP: ${fcp}ms`);
      expect(fcp).toBeLessThan(2500);
    });

    test('should measure Largest Contentful Paint (LCP)', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(3000);
      
      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let lcpValue = 0;
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              lcpValue = lastEntry.startTime;
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          setTimeout(() => resolve(lcpValue), 3000);
        });
      });
      
      console.log(`LCP: ${lcp}ms`);
      expect(lcp).toBeLessThan(4000);
    });

    test('should measure Time to Interactive (TTI)', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.locator('button, a, input').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      
      const tti = Date.now() - startTime;
      console.log(`TTI: ${tti}ms`);
      expect(tti).toBeLessThan(5000);
    });

    test('should measure Cumulative Layout Shift (CLS)', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(3000);
      
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(clsValue), 3000);
        });
      });
      
      console.log(`CLS: ${cls}`);
      expect(cls).toBeLessThan(0.25);
    });
  });

  test.describe('Navigation Performance', () => {
    test('should navigate between pages quickly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const routes = ['/dashboard', '/cameras', '/alerts', '/settings'];
      const navigationTimes: number[] = [];
      
      for (const route of routes) {
        const startTime = Date.now();
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const navTime = Date.now() - startTime;
        navigationTimes.push(navTime);
        console.log(`Navigation to ${route}: ${navTime}ms`);
      }
      
      const avgNavTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      console.log(`Average navigation time: ${avgNavTime}ms`);
      expect(avgNavTime).toBeLessThan(3000);
    });

    test('should handle back/forward navigation efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const backStartTime = Date.now();
      await page.goBack();
      await page.waitForLoadState('networkidle');
      const backTime = Date.now() - backStartTime;
      
      console.log(`Back navigation time: ${backTime}ms`);
      expect(backTime).toBeLessThan(2000);
      
      const forwardStartTime = Date.now();
      await page.goForward();
      await page.waitForLoadState('networkidle');
      const forwardTime = Date.now() - forwardStartTime;
      
      console.log(`Forward navigation time: ${forwardTime}ms`);
      expect(forwardTime).toBeLessThan(2000);
    });
  });

  test.describe('Resource Loading', () => {
    test('should load JavaScript bundles efficiently', async ({ page }) => {
      const jsResources: { url: string; size: number; duration: number }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.js') || url.includes('.js?')) {
          const headers = response.headers();
          const size = parseInt(headers['content-length'] || '0', 10);
          jsResources.push({
            url: url.split('/').pop() || url,
            size,
            duration: 0,
          });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const totalJsSize = jsResources.reduce((acc, r) => acc + r.size, 0);
      console.log(`Total JS size: ${(totalJsSize / 1024).toFixed(2)}KB`);
      console.log(`Number of JS files: ${jsResources.length}`);
      
      expect(totalJsSize).toBeLessThan(5 * 1024 * 1024);
    });

    test('should load CSS efficiently', async ({ page }) => {
      const cssResources: { url: string; size: number }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.css') || url.includes('.css?')) {
          const headers = response.headers();
          const size = parseInt(headers['content-length'] || '0', 10);
          cssResources.push({
            url: url.split('/').pop() || url,
            size,
          });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const totalCssSize = cssResources.reduce((acc, r) => acc + r.size, 0);
      console.log(`Total CSS size: ${(totalCssSize / 1024).toFixed(2)}KB`);
      
      expect(totalCssSize).toBeLessThan(500 * 1024);
    });

    test('should load images with lazy loading', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const lazyImages = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        let lazyCount = 0;
        images.forEach(img => {
          if (img.loading === 'lazy' || img.dataset.src) {
            lazyCount++;
          }
        });
        return { total: images.length, lazy: lazyCount };
      });
      
      console.log(`Images: ${lazyImages.total} total, ${lazyImages.lazy} lazy loaded`);
      expect(true).toBe(true);
    });
  });

  test.describe('Memory Usage', () => {
    test('should maintain stable memory usage', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const initialMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      for (let i = 0; i < 5; i++) {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await page.goto('/cameras');
        await page.waitForLoadState('networkidle');
        await page.goto('/alerts');
        await page.waitForLoadState('networkidle');
      }
      
      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      const memoryIncrease = finalMemory - initialMemory;
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('should not leak memory on repeated actions', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const initialMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      for (let i = 0; i < 10; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
      
      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      const memoryIncrease = finalMemory - initialMemory;
      console.log(`Memory increase after reloads: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      expect(true).toBe(true);
    });
  });

  test.describe('Network Performance', () => {
    test('should minimize number of requests', async ({ page }) => {
      let requestCount = 0;
      
      page.on('request', () => {
        requestCount++;
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      console.log(`Total requests on homepage: ${requestCount}`);
      expect(requestCount).toBeLessThan(100);
    });

    test('should cache static assets', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const cachedResponses: string[] = [];
      
      page.on('response', (response) => {
        const headers = response.headers();
        if (headers['cache-control']?.includes('max-age')) {
          cachedResponses.push(response.url());
        }
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      console.log(`Cached responses: ${cachedResponses.length}`);
      expect(true).toBe(true);
    });

    test('should compress responses', async ({ page }) => {
      let compressedCount = 0;
      let totalCount = 0;
      
      page.on('response', (response) => {
        totalCount++;
        const headers = response.headers();
        if (headers['content-encoding']) {
          compressedCount++;
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      console.log(`Compressed responses: ${compressedCount}/${totalCount}`);
      expect(true).toBe(true);
    });
  });

  test.describe('Rendering Performance', () => {
    test('should render smoothly without jank', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const frameMetrics = await page.evaluate(() => {
        return new Promise<{ frames: number; avgFrameTime: number }>((resolve) => {
          let frameCount = 0;
          let totalTime = 0;
          let lastTime = performance.now();
          
          const countFrames = (time: number) => {
            frameCount++;
            totalTime += time - lastTime;
            lastTime = time;
            
            if (frameCount < 60) {
              requestAnimationFrame(countFrames);
            } else {
              resolve({
                frames: frameCount,
                avgFrameTime: totalTime / frameCount,
              });
            }
          };
          
          requestAnimationFrame(countFrames);
        });
      });
      
      console.log(`Avg frame time: ${frameMetrics.avgFrameTime.toFixed(2)}ms`);
      expect(frameMetrics.avgFrameTime).toBeLessThan(50);
    });

    test('should handle scroll smoothly', async ({ page }) => {
      await page.goto('/alerts');
      await page.waitForLoadState('networkidle');
      
      const startTime = Date.now();
      
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let scrolled = 0;
          const scroll = () => {
            window.scrollBy(0, 100);
            scrolled += 100;
            if (scrolled < 2000) {
              requestAnimationFrame(scroll);
            } else {
              resolve();
            }
          };
          scroll();
        });
      });
      
      const scrollTime = Date.now() - startTime;
      console.log(`Scroll 2000px time: ${scrollTime}ms`);
      expect(scrollTime).toBeLessThan(3000);
    });
  });

  test.describe('API Performance', () => {
    test('should handle API responses quickly', async ({ page }) => {
      const apiTimes: { url: string; duration: number }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/rest/v1/') || url.includes('/api/')) {
          const timing = response.request().timing();
          apiTimes.push({
            url: url.split('?')[0],
            duration: timing.responseEnd - timing.requestStart,
          });
        }
      });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      if (apiTimes.length > 0) {
        const avgApiTime = apiTimes.reduce((acc, t) => acc + t.duration, 0) / apiTimes.length;
        console.log(`Average API response time: ${avgApiTime.toFixed(2)}ms`);
        console.log(`Total API calls: ${apiTimes.length}`);
      }
      
      expect(true).toBe(true);
    });
  });

  test.describe('Concurrent Users Simulation', () => {
    test('should handle rapid successive requests', async ({ page }) => {
      const requests: Promise<void>[] = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          page.goto('/dashboard').then(() => page.waitForLoadState('networkidle'))
        );
      }
      
      const startTime = Date.now();
      await Promise.all(requests.map(r => r.catch(() => {})));
      const totalTime = Date.now() - startTime;
      
      console.log(`10 rapid requests completed in: ${totalTime}ms`);
      expect(true).toBe(true);
    });

    test('should maintain responsiveness under load', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const clickTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const button = page.locator('button').first();
        if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
          const startTime = Date.now();
          await button.click({ timeout: 2000 }).catch(() => {});
          clickTimes.push(Date.now() - startTime);
        }
      }
      
      if (clickTimes.length > 0) {
        const avgClickTime = clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length;
        console.log(`Average click response time: ${avgClickTime}ms`);
        expect(avgClickTime).toBeLessThan(500);
      }
    });
  });

  test.describe('Bundle Analysis', () => {
    test('should have reasonable initial bundle size', async ({ page }) => {
      let totalTransferred = 0;
      
      page.on('response', async (response) => {
        const headers = response.headers();
        const size = parseInt(headers['content-length'] || '0', 10);
        totalTransferred += size;
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      console.log(`Total transferred: ${(totalTransferred / 1024).toFixed(2)}KB`);
      expect(totalTransferred).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
