

## Snapshot visual: BottomNavigation não cobre conteúdo no mobile

Adicionar teste E2E Playwright que captura screenshots do final do conteúdo em viewport mobile e valida que o último elemento renderizado fica acima da BottomNavigation (sem sobreposição).

### Estratégia

Em vez de comparação pixel-a-pixel (frágil com dados dinâmicos), o teste combina:

1. **Asserção geométrica** — mede `getBoundingClientRect()` do último elemento "real" do conteúdo (último filho com altura > 0 dentro de `[data-app-scroll]`) após scroll até o fim. Valida que `bottom <= viewportHeight - 60` (altura da BottomNav).
2. **Screenshot visual** — captura a região inferior da viewport (últimos ~200px) e salva como snapshot baseline. Comparação subsequente com tolerância (`maxDiffPixelRatio: 0.05`) detecta regressões visuais reais sem ruído.

### Arquivo novo

**`tests/e2e/mobile-nav-overlap.spec.ts`**

```ts
import { test, expect, devices } from '@playwright/test';

const PAGES = [
  { path: '/dashboard', name: 'dashboard-v2' },
  { path: '/heatmap', name: 'heatmap' },
  { path: '/analytics', name: 'analytics' },
];

const NAV_HEIGHT = 60;

test.use({ ...devices['iPhone 12'] });

test.describe('BottomNav não cobre conteúdo (mobile)', () => {
  for (const { path, name } of PAGES) {
    test(`${name}: último conteúdo fica acima da BottomNav`, async ({ page }) => {
      const resp = await page.goto(path, { waitUntil: 'networkidle' });
      if (/\/(auth|login)/.test(page.url())) {
        test.skip(true, 'Requer autenticação — coberto pela checagem estática');
        return;
      }

      // Scroll até o fim do scroll container do app
      await page.evaluate(() => {
        const el = document.querySelector('[data-app-scroll]') as HTMLElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(300);

      // Asserção geométrica: último filho visível não invade os 60px da BottomNav
      const overlap = await page.evaluate((navH) => {
        const scroll = document.querySelector('[data-app-scroll]');
        if (!scroll) return { ok: false, reason: 'no-scroll' };
        const children = Array.from(scroll.querySelectorAll('*')).filter((n) => {
          const r = (n as HTMLElement).getBoundingClientRect();
          return r.height > 0 && r.width > 0;
        });
        const last = children[children.length - 1] as HTMLElement | undefined;
        if (!last) return { ok: false, reason: 'no-children' };
        const rect = last.getBoundingClientRect();
        const vh = window.innerHeight;
        return { ok: rect.bottom <= vh - navH + 1, bottom: rect.bottom, vh };
      }, NAV_HEIGHT);

      expect(overlap.ok, `Último elemento em ${path} sobrepõe BottomNav (bottom=${overlap.bottom}, vh=${overlap.vh})`).toBe(true);

      // Snapshot visual da faixa inferior (170px)
      const vp = page.viewportSize()!;
      await expect(page).toHaveScreenshot(`${name}-bottom.png`, {
        clip: { x: 0, y: vp.height - 170, width: vp.width, height: 170 },
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
    });
  }
});
```

### Suporte

- **`package.json`** — adicionar script:
  ```json
  "test:mobile-nav-overlap": "playwright test mobile-nav-overlap"
  ```
- **`playwright.config.ts`** — confirmar `snapshotPathTemplate` (cria `tests/e2e/mobile-nav-overlap.spec.ts-snapshots/`); ajustar se já houver convenção.
- **`.github/workflows/ci.yml`** — adicionar passo após `Mobile Nav Runtime Check`:
  ```yaml
  - name: Mobile Nav Overlap (Visual)
    run: npm run test:mobile-nav-overlap
    continue-on-error: false
  ```
  Snapshots iniciais gerados localmente com `--update-snapshots` antes do primeiro run.

### Comportamento sem credenciais no CI

Igual ao spec runtime existente: rotas que redirecionam para `/auth` retornam `test.skip` (cobertura garantida pelas camadas estáticas). Quando rodar localmente autenticado, valida geometria + snapshot.

### Documentação

- **`docs/LAYOUTS.md` §11** — adicionar Camada 6: "Snapshot visual de sobreposição (BottomNav vs conteúdo)".
- **`mem://standards/mobile-nav-checklist`** — atualizar de 5 para 6 camadas.

### Arquivos editados/criados

- ➕ `tests/e2e/mobile-nav-overlap.spec.ts`
- ➕ `tests/e2e/mobile-nav-overlap.spec.ts-snapshots/*.png` (gerados na primeira execução com `--update-snapshots`)
- ✏️ `package.json` (script `test:mobile-nav-overlap`)
- ✏️ `.github/workflows/ci.yml` (novo passo)
- ✏️ `docs/LAYOUTS.md` (§11 — Camada 6)
- ✏️ `.lovable/memory/standards/mobile-nav-checklist.md` (5 → 6 camadas)

### Riscos

- **Snapshot baseline ausente em CI** — primeira execução falha pedindo `--update-snapshots`. Mitigação: gerar localmente os 3 PNGs e commitar antes de habilitar o passo no CI; alternativamente, o passo roda com `if: false` até baselines existirem.
- **Variação de fontes/cores entre OS** — comparações cross-platform (macOS dev vs Linux CI) podem divergir. Mitigação: gerar baselines no mesmo SO do CI (Ubuntu via container Playwright) ou tolerar com `maxDiffPixelRatio: 0.05`.
- **Conteúdo dinâmico (gráficos/Recharts)** — animações ou dados em tempo real causam flakiness. Mitigação: `animations: 'disabled'` + `waitUntil: 'networkidle'` + clip restrito à faixa inferior (geralmente padding/footer estável).

