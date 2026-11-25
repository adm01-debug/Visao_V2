/**
 * VISÃO - Smoke a11y mobile: validações leves para evitar que mudanças de
 * responsividade quebrem a navegação acessível.
 *
 * **Escopo intencionalmente raso** (smoke, não auditoria completa):
 *   1. **Landmarks** — exatamente 1 `<main>` (ou `[role="main"]`) e
 *      pelo menos 1 `<nav>` (ou `[role="navigation"]`) visíveis.
 *   2. **Hierarquia de heading** — exatamente 1 `<h1>` por página.
 *   3. **ARIA básico** — sem violações detectáveis sem axe:
 *      - `aria-labelledby`/`aria-describedby` apontam para IDs existentes.
 *      - `role` válido (lista mínima de roles WAI-ARIA).
 *      - `aria-hidden="true"` não em elementos focáveis (nav links, buttons).
 *      - Botões/links interativos têm texto acessível (text content,
 *        `aria-label` ou `aria-labelledby`).
 *   4. **BottomNavigation acessível** —
 *      - Link "ativo" tem `aria-current="page"`.
 *      - Cada item de nav é alcançável por tab (não tem `tabindex="-1"`).
 *      - Tamanho mínimo de toque ≥ 44×44px (WCAG 2.5.5 nível AAA, mas
 *        crítico em mobile).
 *
 * Roda APENAS em viewport mobile — desktop tem auditoria via outros specs.
 *
 * **Por que não axe-core:** evitar nova dependência. Estas checagens cobrem
 * 80% das regressões mais comuns (landmarks sumindo, buttons sem label
 * após refactor de ícones, aria-current não atualizado em route changes).
 */
import { devices } from '@playwright/test';
import { test, expect } from './helpers/testFixtures';
import { gotoAuthenticated } from './helpers/authSession';

const PAGES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/heatmap', name: 'Heatmap' },
  { path: '/analytics', name: 'Analytics' },
];

/** Lista mínima de roles WAI-ARIA válidos (não exaustiva — apenas comuns). */
const VALID_ROLES = new Set([
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'dialog',
  'directory',
  'document',
  'feed',
  'figure',
  'form',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'none',
  'note',
  'option',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
]);

// Strip defaultBrowserType — test.use({ defaultBrowserType }) is forbidden inside
// describe blocks (forces a new worker). We keep all viewport/touch/UA settings.
const { defaultBrowserType: _dbt, ...iPhoneA11yConfig } = devices['iPhone 12'];

test.describe('Smoke a11y (mobile)', () => {
  test.use(iPhoneA11yConfig);

  for (const target of PAGES) {
    test(`${target.name} — landmarks e ARIA básico`, async ({ page }) => {
      const ready = await gotoAuthenticated(page, target.path, {
        waitUntil: 'domcontentloaded',
      });
      if (!ready) return;

      await expect(page.locator('[data-app-scroll]')).toBeVisible({ timeout: 10000 });

      // ─── 1. Landmarks ────────────────────────────────────────────────
      const mainCount = await page.locator('main, [role="main"]').count();
      expect(mainCount, 'Deve haver exatamente 1 landmark <main>').toBe(1);

      const navCount = await page.locator('nav:visible, [role="navigation"]:visible').count();
      expect(
        navCount,
        'Deve haver pelo menos 1 <nav> visível (BottomNav esperado em mobile)'
      ).toBeGreaterThanOrEqual(1);

      // ─── 2. Hierarquia de heading ────────────────────────────────────
      // O h1 so monta depois de cameras+alerts responderem (o Dashboard fica
      // em skeleton ate la). Com Supabase frio isso passa de 20s, entao a
      // espera precisa cobrir o carregamento de dados, nao so o mount do React.
      await page
        .locator('h1')
        .first()
        .waitFor({ state: 'attached', timeout: 45_000 })
        .catch(() => {});
      const h1Count = await page.locator('h1').count();
      expect(h1Count, 'Deve haver exatamente 1 <h1> por página').toBe(1);

      // ─── 3. ARIA básico (auditoria custom, sem axe) ──────────────────
      const ariaIssues = await page.evaluate(
        (validRolesArr: string[]) => {
          const validRoles = new Set(validRolesArr);
          const issues: string[] = [];

          // 3a. aria-labelledby / aria-describedby apontam para IDs existentes
          for (const attr of ['aria-labelledby', 'aria-describedby']) {
            const els = document.querySelectorAll(`[${attr}]`);
            els.forEach((el) => {
              const ids = (el.getAttribute(attr) || '').split(/\s+/).filter(Boolean);
              for (const id of ids) {
                if (!document.getElementById(id)) {
                  issues.push(
                    `${attr}="${id}" aponta para ID inexistente em <${el.tagName.toLowerCase()}>`
                  );
                }
              }
            });
          }

          // 3b. role válido
          document.querySelectorAll('[role]').forEach((el) => {
            const role = el.getAttribute('role');
            if (role && !validRoles.has(role)) {
              issues.push(`role="${role}" inválido em <${el.tagName.toLowerCase()}>`);
            }
          });

          // 3c. aria-hidden="true" não em elementos focáveis (nav, button, a com href)
          document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
            const focusable = el.querySelectorAll(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length > 0) {
              issues.push(
                `aria-hidden="true" em <${el.tagName.toLowerCase()}> contém ${focusable.length} elemento(s) focável(eis)`
              );
            }
          });

          // 3d. Botões/links interativos visíveis têm texto acessível
          const interactive = document.querySelectorAll('button:not([disabled]), a[href]');
          interactive.forEach((el) => {
            const rect = el.getBoundingClientRect();
            // ignora invisíveis (modais fechados, menus dropdown não abertos)
            if (rect.width === 0 || rect.height === 0) return;
            const style = window.getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') return;

            const hasText =
              (el.textContent?.trim().length ?? 0) > 0 ||
              !!el.getAttribute('aria-label')?.trim() ||
              !!el.getAttribute('aria-labelledby')?.trim() ||
              !!el.getAttribute('title')?.trim();

            if (!hasText) {
              const tag = el.tagName.toLowerCase();
              const cls = (el.className || '').toString().slice(0, 40);
              issues.push(`<${tag} class="${cls}"> sem nome acessível (text/aria-label/title)`);
            }
          });

          return issues;
        },
        [...VALID_ROLES]
      );

      expect(
        ariaIssues,
        `Violações ARIA detectadas em ${target.path}:\n${ariaIssues.join('\n')}`
      ).toEqual([]);

      // ─── 4. BottomNavigation acessível ───────────────────────────────
      // Procura nav fixo na base (BottomNavigation pattern)
      const bottomNav = page
        .locator('nav')
        .filter({
          has: page.locator('a[href], button'),
        })
        .last();

      const bottomNavVisible = await bottomNav.isVisible().catch(() => false);
      if (bottomNavVisible) {
        // 4a. Pelo menos 1 link com aria-current="page" (rota ativa)
        const activeLinks = await bottomNav.locator('[aria-current="page"]').count();
        // Não falha hard — alguns roteadores marcam de outra forma.
        // Apenas anota se ausente, para encorajar adoção.
        if (activeLinks === 0) {
          test.info().annotations.push({
            type: 'a11y-warning',
            description: `BottomNav em ${target.path} sem aria-current="page" — recomendado para SR users`,
          });
        }

        // 4b. Itens não devem ter tabindex="-1" (precisam ser navegáveis)
        const negativeTabIndex = await bottomNav
          .locator('a[tabindex="-1"], button[tabindex="-1"]')
          .count();
        expect(
          negativeTabIndex,
          `BottomNav tem ${negativeTabIndex} item(s) com tabindex="-1" (inacessíveis por teclado)`
        ).toBe(0);

        // 4c. Tamanho mínimo de toque ≥ 44×44 (WCAG 2.5.5)
        const tooSmallTouchTargets = await bottomNav.evaluate((nav) => {
          const items = nav.querySelectorAll('a[href], button');
          const small: string[] = [];
          items.forEach((item) => {
            const rect = item.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
              small.push(
                `${item.tagName.toLowerCase()}[${(item.textContent || '').trim().slice(0, 20)}]: ${Math.round(rect.width)}×${Math.round(rect.height)}`
              );
            }
          });
          return small;
        });
        expect(
          tooSmallTouchTargets,
          `Touch targets < 44×44px em ${target.path}:\n${tooSmallTouchTargets.join('\n')}`
        ).toEqual([]);
      }
    });
  }
});
