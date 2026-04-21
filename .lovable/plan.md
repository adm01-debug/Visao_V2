

## Lint + typecheck + testes em uma única passada

Executar e reportar, em sequência, os 3 gates de qualidade do projeto após a refatoração recente (skeletons ARIA, `<Page>` wrapper, dashboard de cobertura), produzindo um relatório consolidado para evidenciar que não há regressões de estilo, tipo ou comportamento.

### O que será executado (ordem rápido → lento)

| # | Gate | Comando | O que cobre |
|---|------|---------|-------------|
| 1 | TypeScript estrito | `npx tsc --noEmit` (usa `tsconfig.json`) | Tipagem em `src/` (strict, noImplicitAny, noUncheckedIndexedAccess) |
| 2 | ESLint zero-warnings | `npm run lint -- --max-warnings=0` | Estilo, regras React/TS, `visao/no-hardcoded-colors` |
| 3 | Vitest | `npx vitest run --reporter=verbose` | 118 testes unitários atuais |
| 4 | Build de validação | `npm run build` | Confirma que o erro do dashboard de cobertura sumiu (arquivos `CoverageTable.tsx`, `CoverageStatsCards.tsx`, etc. já existem no disco — o erro reportado deve ser cache stale) |

### Como o resultado será apresentado

- Bloco de resumo no chat com:
  - ✅/❌ por gate.
  - Contagem `errors` / `warnings` do lint.
  - Contagem `pass/fail/total` + tempo do Vitest.
  - Primeiras 20 linhas de cada falha (se houver), agrupadas por arquivo.
- Se algum gate falhar: lista de correções propostas, agrupadas por origem (refator de skeletons, `<Page>` wrapper, dashboard de cobertura, ou pré-existente).
- Geração de um arquivo `/mnt/documents/quality-gates-report.txt` com o stdout/stderr completo dos 3 comandos, para arquivamento.

### Tratamento de erros conhecidos

- **Pré-existentes não relacionados à refatoração** (ex.: type errors em `@dnd-kit/utilities` dentro de `src/components/widgets/` mencionados na rodada anterior) serão **listados separadamente** e marcados como "fora de escopo desta verificação", para não confundir o que veio das mudanças recentes.
- **Erro de build do CoveragePage** (`Could not load … CoverageTable`): os arquivos já existem no FS (`CoverageTable.tsx`, `CoverageStatsCards.tsx`, `CoverageRow.tsx`, `CoverageFilters.tsx`). Esperado que o build passe nesta execução; se persistir, será corrigido em seguida ajustando os imports para incluir extensão explícita ou `index.ts` na pasta.

### Critérios de aceitação

- Os 3 comandos rodam até o fim (mesmo se algum falhar — não interrompe na primeira falha).
- Relatório no chat resume claramente o estado de cada gate.
- Arquivo `quality-gates-report.txt` em `/mnt/documents/` com saída completa.
- Falhas relacionadas às refatorações recentes têm proposta de correção objetiva.
- Nenhuma alteração de código nesta rodada — apenas execução e relatório. Se o usuário aprovar correções, elas vêm em rodada subsequente.

### Riscos

- **Risco:** lint/typecheck podem demorar (>2 min cada em projetos grandes).
  - **Mitigação:** rodar os 3 em sequência com timeout adequado; se passar de 5 min cada, abortar e usar `--max-warnings=10` temporário só para diagnosticar.
- **Risco:** muitos warnings pré-existentes podem inundar o relatório.
  - **Mitigação:** sumarizar por contagem e mostrar só as 20 primeiras linhas de cada categoria.
- **Risco:** Vitest pode falhar por algum mock global novo introduzido na refator.
  - **Mitigação:** se >5 falhas, isolar por arquivo e propor fix targetado.

### Arquivos a criar/editar

- ➕ `/mnt/documents/quality-gates-report.txt` (saída consolidada)
- Nenhum arquivo do projeto será editado nesta rodada.

