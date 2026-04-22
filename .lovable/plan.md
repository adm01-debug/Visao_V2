

## Teste visual automatizado: validação `mb-mobile-nav` em todas as rotas mobile

Adicionar suíte Playwright que captura screenshots em viewport mobile (iPhone 13) de cada rota crítica, comparando com snapshots baseline. Detecta automaticamente sobreposição da `BottomNavigation` com conteúdo da página (problema recorrente que `mb-mobile-nav` deve resolver).

### Estado atual

- `playwright.config` existe com projetos `mobile-safari` (iPhone 13).
- `tests/mobile-nav-overlap.spec.ts` já existe (referenciado em `package.json` como `test:mobile-nav-overlap`) — provavelmente testa overlap pontual em poucas rotas.
- `tests/mobile-nav-padding.spec.ts` valida padding programaticamente (sem screenshot).
- `scripts/check-mobile-nav.mjs` valida estaticamente que `mb-mobile-nav` aparece só no `MainLayout`.
- Falta: snapshot visual completo cobrindo TODAS as rotas autenticadas em mobile, com baseline versionado.

### Solução em 3 entregas

**Entrega 1 — Suíte de visual regression (`tests/mobile-nav-visual.spec.ts`)**

Nova spec dedicada que:

1. Define array de rotas críticas (alinhado ao `lazyRoutes.ts`): `/`, `/cameras`, `/alerts`, `/zones`, `/recordings`, `/analytics`, `/settings`, `/users`, `/face-recognition`, `/license-plate`, `/productivity`, `/heatmap`, `/automation`, `/security`, `/behavior-detection`.
2. Para cada rota:
   - Faz login (reutiliza `tests/helpers/auth.ts` se existir, senão cria fixture).
   - Navega até a rota.
   - Aguarda `networkidle` + heurística de carregamento (sem skeletons visíveis).
   - Captura **2 screenshots**:
     - **Full-page**: detecta visualmente layout geral.
     - **Bottom 200px crop**: zoom na zona crítica onde `BottomNavigation` (h-16 = 64px) sobrepõe conteúdo.
   - Compara com baseline em `tests/__snapshots__/mobile-nav-visual/`.
3. Threshold: `maxDiffPixelRatio: 0.02` (2%, tolera anti-aliasing) + `threshold: 0.2` por pixel.
4. Falha se diff > threshold OU se baseline não existir (CI gera baseline → commit manual).

**Entrega 2 — Helper de detecção programática de overlap (`tests/helpers/detectOverlap.ts`)**

Função reutilizável que, dado um page Playwright:

1. Pega `boundingBox` da `BottomNavigation` (selector `[data-testid="bottom-navigation"]` ou `nav.fixed.bottom-0`).
2. Pega `boundingBox` do **último elemento interativo visível** dentro do `<main>` (botão, link, input).
3. Calcula intersecção; falha com mensagem clara se houver overlap > 4px (margem de tolerância).
4. Retorna metadata (`{overlap: number, mainBottom: number, navTop: number}`) para diagnóstico.

A spec visual também chama esse helper como **assertion programática paralela** (defesa em profundidade — pega casos que diff visual perde por anti-aliasing).

**Entrega 3 — Scripts npm + integração CI**

Adicionar em `package.json`:

```json
{
  "scripts": {
    "test:mobile-nav-visual": "playwright test mobile-nav-visual --project=mobile-safari",
    "test:mobile-nav-visual:update": "playwright test mobile-nav-visual --project=mobile-safari --update-snapshots"
  }
}
```

Adicionar step em `.github/workflows/ci.yml` (após `test:mobile-nav-overlap`):

```yaml
- name: Mobile Nav Visual Regression
  run: npm run test:mobile-nav-visual -- --workers=2
  env:
    CI: true
- name: Upload Visual Diff Artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: mobile-nav-visual-diffs
    path: test-results/
    retention-days: 14
```

Criar `docs/MOBILE_NAV_VISUAL_TESTING.md`:
- Como rodar localmente (`npm run test:mobile-nav-visual`).
- Como atualizar baseline após mudança intencional (`npm run test:mobile-nav-visual:update`).
- Como interpretar diff (pasta `test-results/<spec>/<name>/`).
- Política: baseline commitado no repo; mudança visual exige update + revisão no PR.

### Critérios de aceitação

- ✅ `npm run build` passa (Passo 0 herdado: limpar cache se necessário).
- ✅ `tests/mobile-nav-visual.spec.ts` cobre ≥ 12 rotas mobile.
- ✅ Helper `detectOverlap.ts` retorna `overlap: 0` quando `mb-mobile-nav` está aplicado corretamente.
- ✅ Primeira execução gera baselines em `tests/__snapshots__/mobile-nav-visual/` (commit manual no PR).
- ✅ Step CI adicionado e configurado para upload de artifacts em failure.
- ✅ `docs/MOBILE_NAV_VISUAL_TESTING.md` criado.
- ✅ Tentativa simulada: remover `mb-mobile-nav` do MainLayout → spec falha com diff visual + helper detecta overlap.

### Arquivos a criar/editar

| Arquivo | Mudança |
|---|---|
| `tests/mobile-nav-visual.spec.ts` | ➕ Criar (suíte principal) |
| `tests/helpers/detectOverlap.ts` | ➕ Criar (helper compartilhado) |
| `tests/helpers/auth.ts` | ✏️ Reusar se existir, senão criar mínimo |
| `package.json` | ✏️ 2 scripts `test:mobile-nav-visual*` |
| `.github/workflows/ci.yml` | ✏️ 2 steps (visual + upload) |
| `docs/MOBILE_NAV_VISUAL_TESTING.md` | ➕ Criar (guia) |

### Riscos e mitigações

- **Risco:** snapshots variam entre OS (Linux CI vs Mac dev) por anti-aliasing/fontes.
  - **Mitigação:** rodar baseline geração no CI Linux (não em Mac local); usar `maxDiffPixelRatio: 0.02` para tolerar pequenas variações; documentar processo no `.md`.
- **Risco:** rotas com dados dinâmicos (timestamps, contadores realtime) geram diff falso.
  - **Mitigação:** mascarar elementos dinâmicos via `mask: [page.locator('[data-dynamic]')]` no `toHaveScreenshot`. Documentar convenção de adicionar `data-dynamic` em widgets que mudam.
- **Risco:** primeira execução gera 12+ baselines de uma vez, dificultando revisão.
  - **Mitigação:** PR de introdução commita baselines + screenshots no description; revisão manual obrigatória; doc explica processo.
- **Risco:** suíte fica lenta (12 rotas × 2 screenshots = 24+ comparações).
  - **Mitigação:** `--workers=2` no CI; cada rota tem timeout 30s; total esperado < 4min.
- **Risco:** auth fixture quebra se Supabase auth mudar.
  - **Mitigação:** reusar helper existente; criar usuário de teste dedicado via env var `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` documentado no `.md`.
- **Risco:** cache Vite stale volta a quebrar build.
  - **Mitigação:** Passo 0 (rm -rf cache) sempre executado primeiro.

