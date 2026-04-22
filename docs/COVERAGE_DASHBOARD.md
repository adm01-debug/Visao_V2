# Dashboard de Cobertura de Código

Dashboard interno em `/coverage` (acesso restrito a `admin`) que exibe o percentual de cobertura de testes por arquivo, ajudando a priorizar onde adicionar novos testes.

## Como rodar local

```bash
npm run coverage
```

Esse script:

1. Executa `vitest run --coverage` (gera `coverage/coverage-summary.json`).
2. Executa `node scripts/build-coverage-report.mjs`, que produz:
   - `public/coverage-report.json` — consumido pelo dashboard.
   - `public/coverage-report.txt` — versão human-readable para download.

Depois, suba o app (`npm run dev`) e acesse `/coverage` autenticado como admin.

## Como interpretar

Cores semânticas via tokens HSL:

| Faixa     | Status | Cor          |
|-----------|--------|--------------|
| ≥ 80%     | OK     | success (verde) |
| 50% – 79% | Médio  | warning (âmbar) |
| < 50%     | Baixo  | destructive (vermelho) |

### Métricas

- **Statements** — instruções executadas durante os testes.
- **Branches** — caminhos condicionais (if/else, switch, ternários).
- **Functions** — funções/métodos invocados.
- **Lines** — linhas de código atingidas.

A ordenação padrão da tabela é **menor cobertura primeiro**, justamente para destacar arquivos que precisam de atenção.

## Filtros disponíveis

- **Buscar arquivo**: filtra por substring no path.
- **Pasta**: restringe a uma pasta de top-level (`src/components`, `src/hooks`, etc.).
- **Apenas < 80%**: oculta arquivos já considerados bem cobertos.

## Política

- **Arquivos críticos** (`src/services/**`, `src/contexts/AuthContext.tsx`, hooks de autenticação/RBAC) devem ter ≥ 80% de cobertura de statements.
- **Hooks compartilhados** (`src/hooks/**`) devem ter ≥ 70%.
- **Componentes de UI** (`src/components/**`) não têm meta dura — focar em smoke tests + casos de regressão.
- **`src/integrations/supabase/types.ts`** é gerado e está excluído do relatório.

## CI

O workflow `.github/workflows/coverage.yml` roda `npm run coverage` em todo push para `main` (e em PRs):

1. Publica dois **artifacts** (retenção 14 dias):
   - **`coverage-report`** — `coverage/` (HTML Istanbul) + `public/coverage-report.json` + `public/coverage-report.txt`.
   - **`coverage-html`** — `coverage-html.zip` standalone (apenas o HTML interativo, mais leve para download rápido).
2. Adiciona um **summary** em `$GITHUB_STEP_SUMMARY` com **link direto de download** dos dois artifacts (`steps.upload_coverage.outputs.artifact-url` e `steps.upload_html.outputs.artifact-url`), totais por métrica e top 10 arquivos menos cobertos (ordenação asc explícita).
3. Em PRs, posta/atualiza um **comentário idempotente** (marker `<!-- coverage-report-comment -->`) com os mesmos links.

### Botão "Baixar HTML completo (CI)" no dashboard

A página `/coverage` tem um botão que abre a aba de Artifacts do workflow. Para apontar diretamente para a página correta no GitHub do projeto, defina a env Vite:

```
VITE_COVERAGE_HTML_ARTIFACTS_URL=https://github.com/<owner>/<repo>/actions/workflows/coverage.yml
```

Sem essa env, o botão usa um link genérico de busca por `coverage.yml`.

## Estrutura do JSON

```ts
{
  generatedAt: string; // ISO timestamp
  totals: {
    statements: { pct, total, covered, skipped },
    branches:   { pct, total, covered, skipped },
    functions:  { pct, total, covered, skipped },
    lines:      { pct, total, covered, skipped }
  };
  files: Array<{
    path: string; // relativo ao root, ex.: "src/hooks/useAuth.ts"
    statements: { pct, total, covered, skipped };
    branches:   { pct, total, covered, skipped };
    functions:  { pct, total, covered, skipped };
    lines:      { pct, total, covered, skipped };
  }>;
}
```
