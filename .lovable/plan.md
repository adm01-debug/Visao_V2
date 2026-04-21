

## Smoke tests para páginas principais (DashboardV2, Heatmap, Analytics)

Adicionar uma suíte enxuta de smoke tests Playwright que verifica que as 3 páginas críticas carregam sem erros JS, sem erros de rede e renderizam o conteúdo essencial — em viewports desktop **e** mobile (para cobrir regressões de responsividade).

### Estratégia

Smoke tests são intencionalmente rasos: validam apenas que a página **não quebra**, não testam funcionalidades específicas. Escopo:

1. **Sem erros no console** — capturar `console.error` durante o load; falhar se houver qualquer erro (com allowlist mínima para ruído conhecido, ex.: HMR/preload warnings).
2. **Sem erros de rede críticos** — capturar respostas 5xx em chamadas XHR/fetch; ignorar 4xx esperados (ex.: `/auth` quando não logado).
3. **Conteúdo essencial renderizado** — verificar presença de marcadores estáveis: `[data-app-scroll]` (layout autenticado), `<h1>` com título da página, ausência de mensagens de erro do `SectionErrorBoundary`.
4. **Cobertura responsiva** — rodar cada teste em 2 viewports: desktop (1280×720) e mobile (iPhone 12, 390×844).

### Arquivo novo

**`tests/e2e/smoke-pages.spec.ts`**

```ts
import { test, expect, devices } from '@playwright/test';

const PAGES = [
  { path: '/dashboard', name: 'DashboardV2', heading: /dashboard/i },
  { path: '/heatmap',   name: 'Heatmap',     heading: /mapa de calor/i },
  { path: '/analytics', name: 'Analytics',   heading: /analytics|análise/i },
];

const VIEWPORTS = [
  { name: 'desktop', config: { viewport: { width: 1280, height: 720 } } },
  { name: 'mobile',  config: { ...devices['iPhone 12'] } },
];

// Ruído conhecido a ignorar (HMR, devtools, extensions)
const CONSOLE_IGNORE = [
  /\[vite\]/i,
  /Download the React DevTools/i,
  /Lovable/i, // badge/preview noise
];

for (const vp of VIEWPORTS) {
  test.describe(`Smoke (${vp.name})`, () => {
    test.use(vp.config);

    for (const page_ of PAGES) {
      test(`${page_.name} carrega sem erros`, async ({ page }) => {
        const consoleErrors: string[] = [];
        const networkErrors: string[] = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const text = msg.text();
            if (!CONSOLE_IGNORE.some((rx) => rx.test(text))) consoleErrors.push(text);
          }
        });
        page.on('response', (resp) => {
          if (resp.status() >= 500) networkErrors.push(`${resp.status()} ${resp.url()}`);
        });

        await page.goto(page_.path, { waitUntil: 'networkidle' });

        // Pular se redirecionou para auth (sem credenciais seedadas)
        if (/\/(auth|login)/.test(page.url())) {
          test.skip(true, 'Requer autenticação');
          return;
        }

        // 1. Layout autenticado montou
        await expect(page.locator('[data-app-scroll]')).toBeVisible({ timeout: 10000 });

        // 2. Heading principal presente
        await expect(page.locator('h1').first()).toContainText(page_.heading);

        // 3. Nenhum SectionErrorBoundary disparou
        await expect(page.getByText(/algo deu errado|erro ao carregar/i)).toHaveCount(0);

        // 4. Sem erros JS / rede
        expect(consoleErrors, `Console errors em ${page_.path}:\n${consoleErrors.join('\n')}`).toHaveLength(0);
        expect(networkErrors, `Network 5xx em ${page_.path}:\n${networkErrors.join('\n')}`).toHaveLength(0);
      });
    }
  });
}
```

Total: **6 testes** (3 páginas × 2 viewports), execução paralela < 30s.

### Suporte

- **`package.json`** — adicionar script:
  ```json
  "test:smoke": "playwright test smoke-pages"
  ```
- **`.github/workflows/ci.yml`** — novo passo após o build, antes da suíte E2E completa:
  ```yaml
  - name: Smoke tests (páginas principais)
    run: npm run test:smoke
  ```
  Posicionado cedo para falhar rápido em regressões críticas.

### Documentação

- **`docs/LAYOUTS.md`** — adicionar nota curta na seção de testes apontando para `tests/e2e/smoke-pages.spec.ts` como gate mínimo após mudanças de responsividade.
- **`mem://testing/e2e-infrastructure`** — atualizar para mencionar smoke suite separada das suítes de validação específicas.

### Validação pós-implementação

1. `npm run test:smoke` localmente — 6 testes passam (ou skip nas rotas auth).
2. Regressão proposital: introduzir `console.error('boom')` no `useEffect` do `HeatmapPage` → smoke deve falhar com mensagem clara apontando o erro capturado.
3. Verificar que rodar `test:smoke` é < 30s (vs ~3min da suíte E2E completa) — adequado como gate rápido.

### Arquivos editados/criados

- ➕ `tests/e2e/smoke-pages.spec.ts`
- ✏️ `package.json` — script `test:smoke`
- ✏️ `.github/workflows/ci.yml` — novo passo "Smoke tests"
- ✏️ `docs/LAYOUTS.md` — nota sobre smoke suite
- ✏️ `.lovable/memory/testing/e2e-infrastructure.md` — registrar smoke suite

### Riscos

- **Risco:** rotas redirecionam para `/auth` no CI sem credenciais seedadas → testes ficam todos `skipped`.
  - **Mitigação:** mesmo padrão do `mobile-nav-padding.spec.ts` (skip explícito com motivo). Cobertura local autenticada continua valendo; CI pode adicionar fixture de auth depois.
- **Risco:** ruído de console específico do app (logs de dev, warnings de libs) pode causar flakiness.
  - **Mitigação:** `CONSOLE_IGNORE` extensível com regex; ajustar conforme primeiros runs identificarem padrões legítimos.
- **Risco:** `networkidle` pode ser longo em páginas com polling realtime (Supabase subscriptions).
  - **Mitigação:** `waitUntil: 'domcontentloaded'` como fallback se networkidle exceder timeout — ajustar após primeira execução.

