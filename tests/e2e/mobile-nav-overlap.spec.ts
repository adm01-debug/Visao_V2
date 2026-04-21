/**
 * VISÃO - Snapshot visual: BottomNavigation não cobre conteúdo (mobile)
 *
 * Combina asserção geométrica + snapshot visual para detectar sobreposição
 * da BottomNavigation sobre o último elemento de conteúdo nas páginas
 * principais em viewport mobile.
 *
 * - Asserção geométrica: último elemento visível dentro de [data-app-scroll]
 *   deve ter `bottom <= viewportHeight - NAV_HEIGHT`.
 * - Screenshot: faixa inferior da viewport (170px) é comparada com baseline
 *   tolerando até 5% de diff (mitiga flakiness de fontes/recharts).
 *
 * Rotas que redirecionam para /auth (CI sem credenciais seedadas) são
 * marcadas como skipped — cobertura garantida pelas camadas estáticas.
 *
 * Rodar isolado: `npm run test:mobile-nav-overlap`
 * Atualizar baselines: `npm run test:mobile-nav-overlap -- --update-snapshots`
 */
import { test, expect, devices } from '@playwright/test';

const PAGES = [
  { path: '/dashboard', name: 'dashboard-v2' },
  { path: '/heatmap', name: 'heatmap' },
  { path: '/analytics', name: 'analytics' },
];

const NAV_HEIGHT = 60; // BottomNavigation altura efetiva (h-16 = 64px, tolerância 4px)
const CLIP_HEIGHT = 170; // faixa inferior capturada para snapshot

test.use({ ...devices['iPhone 12'] });

test.describe('BottomNav não cobre conteúdo (mobile)', () => {
  for (const { path, name } of PAGES) {
    test(`${name}: último conteúdo fica acima da BottomNav`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' }).catch(() => {});

      if (/\/(auth|login)(\?|$|\/)/.test(page.url())) {
        test.skip(true, `Rota ${path} requer autenticação — coberta pela checagem estática.`);
        return;
      }

      await page.waitForSelector('[data-app-scroll]', { timeout: 10000 }).catch(() => {});

      // Scroll até o fim do scroll container do app
      await page.evaluate(() => {
        const el = document.querySelector('[data-app-scroll]') as HTMLElement | null;
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(400);

      // Asserção geométrica: último filho visível não invade a BottomNav
      const overlap = await page.evaluate((navH) => {
        const scroll = document.querySelector('[data-app-scroll]');
        if (!scroll) return { ok: false, reason: 'no-scroll', bottom: 0, vh: 0 };
        const candidates = Array.from(scroll.querySelectorAll('*')).filter((n) => {
          const r = (n as HTMLElement).getBoundingClientRect();
          return r.height > 0 && r.width > 0;
        });
        const last = candidates[candidates.length - 1] as HTMLElement | undefined;
        if (!last) return { ok: false, reason: 'no-children', bottom: 0, vh: window.innerHeight };
        const rect = last.getBoundingClientRect();
        const vh = window.innerHeight;
        return { ok: rect.bottom <= vh - navH + 1, reason: 'measured', bottom: rect.bottom, vh };
      }, NAV_HEIGHT);

      expect(
        overlap.ok,
        `Último elemento em ${path} sobrepõe BottomNav (bottom=${overlap.bottom}, vh=${overlap.vh}, motivo=${overlap.reason})`
      ).toBe(true);

      // Snapshot visual da faixa inferior
      const vp = page.viewportSize();
      if (!vp) return;
      await expect(page).toHaveScreenshot(`${name}-bottom.png`, {
        clip: { x: 0, y: vp.height - CLIP_HEIGHT, width: vp.width, height: CLIP_HEIGHT },
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
    });
  }
});
