# Mobile Nav Visual Testing

Suíte de regressão visual que garante que a `BottomNavigation` nunca cobre conteúdo de página em viewport mobile (iPhone 12). Resolve o problema recorrente de esquecer `mb-mobile-nav` no `MainLayout`.

## Arquitetura (defesa em 3 camadas)

| Camada          | Mecanismo                                                                   | Arquivo                               |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------- |
| 1. Estática     | Garante `mb-mobile-nav` declarado **uma única vez** no `MainLayout`         | `scripts/check-mobile-nav.mjs`        |
| 2. Programática | Mede `boundingBox` real do último elemento interativo vs `BottomNavigation` | `tests/e2e/helpers/detectOverlap.ts`  |
| 3. Visual       | Compara screenshots (full-page + faixa inferior) com baseline versionado    | `tests/e2e/mobile-nav-visual.spec.ts` |

## Rotas cobertas

16 rotas autenticadas críticas: `/`, `/dashboard`, `/cameras`, `/alerts`, `/zones`, `/recordings`, `/analytics`, `/settings`, `/users`, `/face-recognition`, `/license-plate`, `/productivity`, `/heatmap`, `/automation`, `/security`, `/behavior-detection`.

Rotas que redirecionam para `/auth` são automaticamente marcadas como `skipped` quando o CI não tem credenciais — a cobertura estática + programática garante que `mb-mobile-nav` segue presente.

## Comandos

```bash
# Rodar suíte (compara contra baseline)
npm run test:mobile-nav-visual

# Atualizar baseline após mudança visual intencional
npm run test:mobile-nav-visual:update
```

## Política de baseline

- **Baselines vivem em `tests/e2e/mobile-nav-visual.spec.ts-snapshots/`** e são commitados no repo.
- **Geração inicial** deve rodar no CI Linux para evitar diferenças de fonte/anti-aliasing entre macOS e Linux.
- **Mudança visual intencional** (refatoração de layout, novo header, etc.) exige:
  1. Rodar `npm run test:mobile-nav-visual:update` localmente OU baixar baselines do CI artifact.
  2. Commitar imagens atualizadas com mensagem `chore(visual): update mobile-nav baselines after <motivo>`.
  3. Reviewer deve abrir cada PNG modificada no PR e confirmar que a mudança é desejada.

## Tolerância

- `maxDiffPixelRatio: 0.02` (2% dos pixels podem divergir)
- `threshold: 0.2` por pixel (cor: 0=idêntico, 1=oposto)
- Helper programático: 4px de tolerância para arredondamento subpixel

## Mascarar elementos dinâmicos

Widgets que mudam entre runs (timestamps, contadores realtime, gráficos com dados live) devem receber atributo `data-dynamic`:

```tsx
<span data-dynamic>{formatDistanceToNow(date)}</span>
```

A spec aplica `mask: [page.locator('[data-dynamic]')]` automaticamente.

## Interpretação de falha no CI

Quando o CI falha:

1. Acesse a action que falhou no GitHub.
2. Baixe o artifact `mobile-nav-visual-diffs` (retenção: 14 dias).
3. Pasta `test-results/<spec>-<test>/` contém:
   - `<name>-actual.png` — capturado no run atual
   - `<name>-expected.png` — baseline esperado
   - `<name>-diff.png` — diff highlighted em vermelho
4. Se a mudança for intencional → atualizar baseline (ver acima).
5. Se for regressão → corrigir layout (provavelmente falta `mb-mobile-nav`).

## Credenciais para rotas autenticadas (futuro)

Para cobrir 100% das rotas no CI, criar usuário de teste dedicado:

```bash
# Variáveis a definir como GitHub Secrets
E2E_TEST_EMAIL=playwright-bot@visao.example
E2E_TEST_PASSWORD=<senha-segura>
```

E estender `tests/e2e/helpers/auth.ts` com `loginAsTestUser(page)`. Atualmente, rotas protegidas redirecionam → spec marca como `skipped` (não falha).

## Performance

- 16 rotas × 2 screenshots = 32 comparações.
- CI usa `--workers=2`; tempo esperado < 4 min.
- Cada teste tem timeout 30s.
